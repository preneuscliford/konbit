-- Notifications push (Expo push service, via Firebase Cloud Messaging).
-- Chaque notification insérée déclenche la fonction Edge send-push, qui la
-- relit elle-même et ne l'envoie qu'une fois (colonne pushed_at).

create extension if not exists pg_net with schema extensions;

-- Jetons push des téléphones. Pas d'accès direct : register/unregister ci-dessous.
create table public.push_tokens (
  token text primary key check (token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Langue choisie dans l'app, pour écrire la notification en kreyòl ou en français.
  language text not null default 'ht' check (language in ('ht', 'fr')),
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;

-- Un même téléphone peut changer de compte : le jeton est rattaché au compte connecté.
create function public.register_push_token(push_token text, push_language text default 'ht')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  insert into public.push_tokens (token, user_id, language, updated_at)
  values (push_token, auth.uid(), coalesce(push_language, 'ht'), now())
  on conflict (token) do update
    set user_id = excluded.user_id, language = excluded.language, updated_at = now();
end;
$$;

create function public.unregister_push_token(push_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens where token = push_token and user_id = auth.uid();
$$;

revoke execute on function public.register_push_token, public.unregister_push_token from public, anon;
grant execute on function public.register_push_token, public.unregister_push_token to authenticated;

-- Envoyée une seule fois : la fonction send-push "réserve" la notification
-- (update ... where pushed_at is null) avant d'envoyer.
alter table public.notifications add column pushed_at timestamptz;

create function private.push_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://wnwyohyfjofdegyvjkfb.supabase.co/functions/v1/send-push',
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 5000
  );
  return null;
end;
$$;

create trigger notifications_push
  after insert on public.notifications
  for each row execute function private.push_notification();

revoke execute on function private.push_notification from public, anon, authenticated;
