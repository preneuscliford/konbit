-- Suivre une personne, être notifié de ses publications (cloche, désactivée
-- par défaut comme sur X), compteurs abonnés/abonnements, notifications dans
-- l'app. Les notifications sont créées par des triggers, jamais par l'app.

-- Compteurs affichés sur le profil (maintenus par trigger, non modifiables par l'app).
alter table public.profiles
  add column followers_count integer not null default 0,
  add column following_count integer not null default 0;

create table public.follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  -- Cloche : être notifié quand cette personne publie un konbit.
  notify boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee_idx on public.follows (followee_id, created_at desc);
create index follows_follower_idx on public.follows (follower_id, created_at desc);

alter table public.follows enable row level security;

create policy "Abonnements visibles par tous" on public.follows
  for select using (true);

create policy "Suivre avec un pseudo" on public.follows
  for insert to authenticated
  with check (follower_id = (select auth.uid()) and private.has_pseudo());

create policy "Régler sa cloche" on public.follows
  for update to authenticated
  using (follower_id = (select auth.uid()))
  with check (follower_id = (select auth.uid()));

create policy "Ne plus suivre" on public.follows
  for delete to authenticated
  using (follower_id = (select auth.uid()));

revoke insert, update, delete on public.follows from anon, authenticated;
grant insert (followee_id, notify) on public.follows to authenticated;
grant update (notify) on public.follows to authenticated;
grant delete on public.follows to authenticated;

-- Notifications dans l'app.
create table public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('new_konbit', 'new_follower')),
  konbit_id bigint references public.konbits (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_id) where read_at is null;
create index notifications_actor_idx on public.notifications (actor_id);
create index notifications_konbit_idx on public.notifications (konbit_id);

alter table public.notifications enable row level security;

create policy "Voir ses notifications" on public.notifications
  for select to authenticated
  using (recipient_id = (select auth.uid()));

create policy "Marquer ses notifications lues" on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

revoke insert, update, delete on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Compteurs + notification "nouvel abonné" (une seule par personne et par jour,
-- pour éviter le spam suivre/ne plus suivre).
create function private.on_follow_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set followers_count = followers_count + 1 where id = new.followee_id;
    if not exists (
      select 1 from public.notifications
      where recipient_id = new.followee_id and actor_id = new.follower_id
        and type = 'new_follower' and created_at > now() - interval '1 day'
    ) then
      insert into public.notifications (recipient_id, actor_id, type)
      values (new.followee_id, new.follower_id, 'new_follower');
    end if;
  else
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    update public.profiles set followers_count = greatest(followers_count - 1, 0) where id = old.followee_id;
  end if;
  return null;
end;
$$;

create trigger follows_change
  after insert or delete on public.follows
  for each row execute function private.on_follow_change();

-- Nouveau konbit : une notification pour chaque abonné qui a activé la cloche.
create function private.notify_followers_of_konbit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'visible' then
    insert into public.notifications (recipient_id, actor_id, type, konbit_id)
    select f.follower_id, new.author_id, 'new_konbit', new.id
    from public.follows f
    where f.followee_id = new.author_id and f.notify;
  end if;
  return null;
end;
$$;

create trigger konbits_notify_followers
  after insert on public.konbits
  for each row execute function private.notify_followers_of_konbit();

revoke execute on function private.on_follow_change, private.notify_followers_of_konbit from public, anon, authenticated;
