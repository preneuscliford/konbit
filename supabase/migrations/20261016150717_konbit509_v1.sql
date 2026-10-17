-- Konbit 509 v1 : konbits (posts courts), participants ("Mwen ladan"),
-- réponses, signalements d'abus, feature flags.
-- Lecture publique (même sans compte) ; écriture réservée aux comptes ayant
-- choisi un pseudo. Les compteurs, statuts et rôles ne sont modifiables que
-- par les triggers ci-dessous, jamais par le client.
-- Le Signalement HaïtiScope (anonyme) n'a rien à voir avec ces tables.

-- ---------------------------------------------------------------------------
-- Profils
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Choisi au premier passage dans l'app ; null tant que ce n'est pas fait.
  pseudo text check (pseudo ~ '^[A-Za-z0-9_]{3,20}$'),
  -- Slug du catalogue de communes HaïtiScope (GET /api/v1/konbit/communes).
  commune_slug text check (commune_slug ~ '^[a-z0-9-]{2,60}$'),
  role text not null default 'user' check (role in ('user', 'tester', 'moderator', 'admin')),
  created_at timestamptz not null default now()
);

create unique index profiles_pseudo_unique on public.profiles (lower(pseudo));

-- Un profil vide est créé à l'inscription (Google). "or replace" : sur le
-- projet konbit, la fonction et le trigger existaient déjà (ancien schéma).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger
                 where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end;
$$;

create function public.has_pseudo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and pseudo is not null);
$$;

create function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('moderator', 'admin'));
$$;

-- Comptes créés avant ce schéma : profil vide, pseudo à choisir dans l'app.
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

alter table public.profiles enable row level security;

create policy "Profils publics" on public.profiles
  for select using (true);

create policy "Chacun modifie son profil" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Le rôle n'est jamais modifiable depuis l'app.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (pseudo, commune_slug) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Konbits
-- ---------------------------------------------------------------------------
create table public.konbits (
  id bigint generated always as identity primary key,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 280),
  commune_slug text not null check (commune_slug ~ '^[a-z0-9-]{2,60}$'),
  -- hidden = masqué automatiquement après signalements, en attente de revue.
  status text not null default 'visible' check (status in ('visible', 'hidden', 'removed')),
  participant_count integer not null default 0,
  reply_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index konbits_feed_idx on public.konbits (created_at desc, id desc) where status = 'visible';
create index konbits_author_idx on public.konbits (author_id);

alter table public.konbits enable row level security;

create policy "Konbits visibles par tous" on public.konbits
  for select using (status = 'visible' or author_id = (select auth.uid()) or public.is_moderator());

create policy "Publier avec un pseudo" on public.konbits
  for insert to authenticated
  with check (author_id = (select auth.uid()) and public.has_pseudo());

create policy "L'auteur supprime son konbit" on public.konbits
  for delete to authenticated
  using (author_id = (select auth.uid()));

revoke insert, update, delete on public.konbits from anon, authenticated;
grant insert (body, commune_slug) on public.konbits to authenticated;
grant delete on public.konbits to authenticated;

-- Anti-spam : 10 konbits par heure et par compte.
create function public.limit_konbit_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.konbits
      where author_id = new.author_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger konbits_rate_limit
  before insert on public.konbits
  for each row execute function public.limit_konbit_rate();

-- ---------------------------------------------------------------------------
-- Participants ("Mwen ladan")
-- ---------------------------------------------------------------------------
create table public.konbit_participants (
  konbit_id bigint not null references public.konbits (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (konbit_id, user_id)
);

create index konbit_participants_user_idx on public.konbit_participants (user_id);

alter table public.konbit_participants enable row level security;

create policy "Participants visibles par tous" on public.konbit_participants
  for select using (true);

create policy "Rejoindre avec un pseudo" on public.konbit_participants
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.has_pseudo()
    and exists (select 1 from public.konbits k where k.id = konbit_id and k.status = 'visible')
  );

create policy "Quitter un konbit" on public.konbit_participants
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on public.konbit_participants from anon, authenticated;
grant insert (konbit_id) on public.konbit_participants to authenticated;
grant delete on public.konbit_participants to authenticated;

create function public.sync_participant_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.konbits set participant_count = participant_count + 1 where id = new.konbit_id;
  else
    update public.konbits set participant_count = greatest(participant_count - 1, 0) where id = old.konbit_id;
  end if;
  return null;
end;
$$;

create trigger konbit_participants_count
  after insert or delete on public.konbit_participants
  for each row execute function public.sync_participant_count();

-- ---------------------------------------------------------------------------
-- Réponses (fil de discussion sous un konbit)
-- ---------------------------------------------------------------------------
create table public.konbit_replies (
  id bigint generated always as identity primary key,
  konbit_id bigint not null references public.konbits (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 280),
  status text not null default 'visible' check (status in ('visible', 'hidden', 'removed')),
  created_at timestamptz not null default now()
);

create index konbit_replies_thread_idx on public.konbit_replies (konbit_id, created_at, id);
create index konbit_replies_author_idx on public.konbit_replies (author_id);

alter table public.konbit_replies enable row level security;

create policy "Réponses visibles par tous" on public.konbit_replies
  for select using (status = 'visible' or author_id = (select auth.uid()) or public.is_moderator());

create policy "Répondre avec un pseudo" on public.konbit_replies
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.has_pseudo()
    and exists (select 1 from public.konbits k where k.id = konbit_id and k.status = 'visible')
  );

create policy "L'auteur supprime sa réponse" on public.konbit_replies
  for delete to authenticated
  using (author_id = (select auth.uid()));

revoke insert, update, delete on public.konbit_replies from anon, authenticated;
grant insert (konbit_id, body) on public.konbit_replies to authenticated;
grant delete on public.konbit_replies to authenticated;

create function public.sync_reply_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.konbits set reply_count = reply_count + 1 where id = new.konbit_id;
  else
    update public.konbits set reply_count = greatest(reply_count - 1, 0) where id = old.konbit_id;
  end if;
  return null;
end;
$$;

create trigger konbit_replies_count
  after insert or delete on public.konbit_replies
  for each row execute function public.sync_reply_count();

-- Anti-spam : 30 réponses par heure et par compte.
create function public.limit_reply_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.konbit_replies
      where author_id = new.author_id and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger konbit_replies_rate_limit
  before insert on public.konbit_replies
  for each row execute function public.limit_reply_rate();

-- ---------------------------------------------------------------------------
-- Signalements d'abus (modération)
-- ---------------------------------------------------------------------------
create table public.abuse_reports (
  id bigint generated always as identity primary key,
  target_type text not null check (target_type in ('konbit', 'reply')),
  target_id bigint not null,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'hate', 'violence', 'false_info', 'other')),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  handled_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (target_type, target_id, reporter_id)
);

create index abuse_reports_open_idx on public.abuse_reports (target_type, target_id) where status = 'open';

alter table public.abuse_reports enable row level security;

create policy "Signaler un abus" on public.abuse_reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()));

create policy "Voir ses propres signalements" on public.abuse_reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_moderator());

revoke insert, update, delete on public.abuse_reports from anon, authenticated;
grant insert (target_type, target_id, reason) on public.abuse_reports to authenticated;

-- 3 comptes distincts signalent le même contenu : il est masqué en attente de revue.
create function public.auto_hide_reported()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reporters integer;
begin
  select count(distinct reporter_id) into reporters
  from public.abuse_reports
  where target_type = new.target_type and target_id = new.target_id and status = 'open';

  if reporters >= 3 then
    if new.target_type = 'konbit' then
      update public.konbits set status = 'hidden' where id = new.target_id and status = 'visible';
    else
      update public.konbit_replies set status = 'hidden' where id = new.target_id and status = 'visible';
    end if;
  end if;
  return null;
end;
$$;

create trigger abuse_reports_auto_hide
  after insert on public.abuse_reports
  for each row execute function public.auto_hide_reported();

-- ---------------------------------------------------------------------------
-- Feature flags (fonctions codées mais désactivées)
-- ---------------------------------------------------------------------------
create table public.feature_flags (
  key text primary key check (key ~ '^[a-z0-9_.-]+$'),
  enabled_for_all boolean not null default false,
  enabled_for_testers boolean not null default false,
  description text
);

alter table public.feature_flags enable row level security;

create policy "Flags lisibles par tous" on public.feature_flags
  for select using (true);

revoke insert, update, delete on public.feature_flags from anon, authenticated;

-- Les flags actifs pour l'appelant (testeurs inclus).
create function public.enabled_flags()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(f.key order by f.key), '{}')
  from public.feature_flags f
  where f.enabled_for_all
     or (f.enabled_for_testers and exists (
       select 1 from public.profiles p where p.id = auth.uid() and p.role in ('tester', 'moderator', 'admin')));
$$;

insert into public.feature_flags (key, description) values
  ('compose.photo', 'Joindre une photo à un konbit'),
  ('compose.category', 'Choisir une catégorie pour un konbit'),
  ('compose.date', 'Donner une date à un konbit'),
  ('settings.notifications', 'Réglages des notifications push');

-- ---------------------------------------------------------------------------
-- Lecture du fil : une seule requête par page (bonne chose sur mauvaise connexion)
-- ---------------------------------------------------------------------------
create function public.konbit_feed(
  cursor_created_at timestamptz default null,
  cursor_id bigint default null,
  page_size integer default 20,
  only_id bigint default null
)
returns table (
  id bigint,
  body text,
  commune_slug text,
  created_at timestamptz,
  participant_count integer,
  reply_count integer,
  author_id uuid,
  author_pseudo text,
  joined boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select k.id, k.body, k.commune_slug, k.created_at, k.participant_count, k.reply_count,
         k.author_id, p.pseudo,
         exists (select 1 from public.konbit_participants kp
                 where kp.konbit_id = k.id and kp.user_id = auth.uid())
  from public.konbits k
  join public.profiles p on p.id = k.author_id
  where k.status = 'visible'
    and (only_id is null or k.id = only_id)
    and (cursor_created_at is null or (k.created_at, k.id) < (cursor_created_at, cursor_id))
  order by k.created_at desc, k.id desc
  limit least(greatest(page_size, 1), 50);
$$;

revoke execute on function public.konbit_feed from public;
grant execute on function public.konbit_feed to anon, authenticated;
revoke execute on function public.enabled_flags from public;
grant execute on function public.enabled_flags to anon, authenticated;
revoke execute on function public.handle_new_user, public.limit_konbit_rate, public.limit_reply_rate,
  public.sync_participant_count, public.sync_reply_count, public.auto_hide_reported from public, anon, authenticated;
