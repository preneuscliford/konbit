-- Administration de Konbit 509 : mesure de l'activité, sanctions (avertir,
-- restreindre, suspendre), retrait de contenus, annonces à tous, statistiques.
--
-- Rôles : admin = tout ; moderator = signalements, avertir, restreindre,
-- retirer/rétablir un contenu. Tout passe par des fonctions qui vérifient le
-- rôle : l'app n'écrit jamais directement dans ces tables.

-- ─── Helpers de rôle et de sanction ────────────────────────────────────────

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Colonnes non lisibles ni modifiables par l'app (pas de grant) : seules les
-- fonctions ci-dessous y accèdent.
alter table public.profiles
  add column last_seen_at timestamptz,
  add column restricted_until timestamptz,
  add column suspended_at timestamptz;

-- Peut publier, répondre, participer, aimer, suivre.
create function private.can_post()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and suspended_at is null
      and (restricted_until is null or restricted_until <= now())
  );
$$;

-- Politiques restrictives : s'ajoutent (ET) aux politiques existantes.
create policy "Compte non restreint" on public.konbits
  as restrictive for insert to authenticated with check (private.can_post());
create policy "Compte non restreint" on public.konbit_replies
  as restrictive for insert to authenticated with check (private.can_post());
create policy "Compte non restreint" on public.konbit_participants
  as restrictive for insert to authenticated with check (private.can_post());
create policy "Compte non restreint" on public.konbit_likes
  as restrictive for insert to authenticated with check (private.can_post());
create policy "Compte non restreint" on public.follows
  as restrictive for insert to authenticated with check (private.can_post());

-- État de son propre compte (pour l'afficher dans l'app).
create function public.my_moderation_status()
returns table (restricted_until timestamptz, suspended boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.restricted_until, p.suspended_at is not null
  from public.profiles p
  where p.id = auth.uid();
$$;

-- ─── Mesure de l'activité ──────────────────────────────────────────────────
-- Un identifiant d'installation tiré au hasard sur le téléphone, une ligne par
-- jour d'utilisation. Jamais relié à un compte (signed_in dit seulement si
-- quelqu'un était connecté ce jour-là).

create table public.app_activity_days (
  day date not null,
  install_id uuid not null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  app_version text check (char_length(app_version) <= 20),
  signed_in boolean not null default false,
  primary key (day, install_id)
);

alter table public.app_activity_days enable row level security;
revoke all on public.app_activity_days from anon, authenticated;

create function public.ping_app(install uuid, app_platform text, version text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'America/Port-au-Prince')::date;
begin
  if app_platform not in ('android', 'ios', 'web') then
    raise exception 'invalid_platform';
  end if;
  insert into public.app_activity_days (day, install_id, platform, app_version, signed_in)
  values (today, install, app_platform, left(version, 20), auth.uid() is not null)
  on conflict (day, install_id) do update
    set signed_in = public.app_activity_days.signed_in or excluded.signed_in,
        app_version = excluded.app_version;

  if auth.uid() is not null then
    update public.profiles set last_seen_at = now()
    where id = auth.uid() and (last_seen_at is null or last_seen_at < now() - interval '10 minutes');
  end if;
end;
$$;

revoke execute on function public.ping_app from public;
grant execute on function public.ping_app to anon, authenticated;

-- Comptes supprimés : seulement la date et l'ancienneté, rien d'identifiant.
create table public.account_deletions (
  id bigint generated always as identity primary key,
  deleted_at timestamptz not null default now(),
  account_age_days integer not null
);

alter table public.account_deletions enable row level security;
revoke all on public.account_deletions from anon, authenticated;

create function private.log_account_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.account_deletions (account_age_days)
  values (greatest(0, extract(day from now() - old.created_at)::integer));
  return null;
end;
$$;

create trigger profiles_log_deletion
  after delete on public.profiles
  for each row execute function private.log_account_deletion();

-- ─── Sanctions et annonces ─────────────────────────────────────────────────

create table public.moderation_actions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null check (action in ('warn', 'restrict', 'suspend', 'lift', 'remove_content', 'restore_content')),
  reason text check (reason in ('spam', 'harassment', 'hate', 'violence', 'false_info', 'other')),
  note text check (char_length(note) <= 500),
  until timestamptz,
  target_type text check (target_type in ('konbit', 'reply')),
  target_id bigint,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index moderation_actions_user_idx on public.moderation_actions (user_id, created_at desc);

alter table public.moderation_actions enable row level security;
revoke all on public.moderation_actions from anon, authenticated;
grant select (id, user_id, action, reason, note, until, target_type, target_id, created_at)
  on public.moderation_actions to authenticated;

-- La personne voit les décisions qui la concernent (sans savoir qui les a prises
-- : l'app ne lit pas created_by) ; l'équipe voit tout.
create policy "Voir ses sanctions" on public.moderation_actions
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_moderator());

create table public.announcements (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 500),
  recipients integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;
revoke all on public.announcements from anon, authenticated;
grant select (id, title, body, created_at) on public.announcements to authenticated;

create policy "Annonces lisibles" on public.announcements
  for select to authenticated using (true);

-- Notifications : sanction et annonce. Pas d'auteur affiché (actor_id null) :
-- ni le nom du modérateur, ni celui de l'admin.
alter table public.notifications
  alter column actor_id drop not null,
  drop constraint notifications_type_check,
  add constraint notifications_type_check
    check (type in ('new_konbit', 'new_follower', 'moderation', 'announcement')),
  add column moderation_action_id bigint references public.moderation_actions (id) on delete cascade,
  add column announcement_id bigint references public.announcements (id) on delete cascade;

create index notifications_moderation_idx on public.notifications (moderation_action_id);
create index notifications_announcement_idx on public.notifications (announcement_id);

-- ─── Actions de l'équipe ───────────────────────────────────────────────────

-- Retirer ou rétablir un konbit / une réponse, et clore ses signalements.
create function public.moderate_content(content_type text, content_id bigint, decision text, decision_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid;
  action_id bigint;
begin
  if not private.is_moderator() then raise exception 'not_allowed'; end if;
  if decision not in ('remove', 'restore') then raise exception 'invalid_decision'; end if;

  if content_type = 'konbit' then
    update public.konbits set status = case decision when 'remove' then 'removed' else 'visible' end
    where id = content_id returning author_id into author;
  elsif content_type = 'reply' then
    update public.konbit_replies set status = case decision when 'remove' then 'removed' else 'visible' end
    where id = content_id returning author_id into author;
  else
    raise exception 'invalid_type';
  end if;
  if author is null then raise exception 'not_found'; end if;

  update public.abuse_reports
  set status = case decision when 'remove' then 'actioned' else 'dismissed' end,
      handled_by = auth.uid()
  where target_type = content_type and target_id = content_id and status = 'open';

  insert into public.moderation_actions (user_id, action, reason, target_type, target_id, created_by)
  values (author, decision || '_content', decision_reason, content_type, content_id, auth.uid())
  returning id into action_id;

  -- Seul un retrait est notifié à l'auteur.
  if decision = 'remove' then
    insert into public.notifications (recipient_id, type, moderation_action_id)
    values (author, 'moderation', action_id);
  end if;
end;
$$;

-- Avertir, restreindre (jours), suspendre, lever une sanction.
create function public.moderate_user(
  target uuid,
  user_action text,
  action_reason text default null,
  action_note text default null,
  days integer default null,
  content_type text default null,
  content_id bigint default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role text;
  action_until timestamptz;
  action_id bigint;
begin
  if not private.is_moderator() then raise exception 'not_allowed'; end if;
  if target = auth.uid() then raise exception 'not_allowed'; end if;

  select role into target_role from public.profiles where id = target;
  if target_role is null then raise exception 'not_found'; end if;
  -- L'équipe ne se sanctionne pas entre elle ; seul l'admin peut toucher un modérateur.
  if target_role = 'admin' or (target_role = 'moderator' and not private.is_admin()) then
    raise exception 'not_allowed';
  end if;
  -- Suspendre et lever une suspension : admin seulement.
  if user_action in ('suspend', 'lift') and not private.is_admin() then
    raise exception 'not_allowed';
  end if;

  if user_action = 'warn' then
    if action_reason is null then raise exception 'reason_required'; end if;
  elsif user_action = 'restrict' then
    if action_reason is null then raise exception 'reason_required'; end if;
    if days is null or days < 1 or days > 365 then raise exception 'invalid_days'; end if;
    action_until := now() + make_interval(days => days);
    update public.profiles set restricted_until = action_until where id = target;
  elsif user_action = 'suspend' then
    if action_reason is null then raise exception 'reason_required'; end if;
    update public.profiles set suspended_at = now() where id = target;
    -- Ses contenus disparaissent ; un rétablissement se fait au cas par cas.
    update public.konbits set status = 'removed' where author_id = target and status <> 'removed';
    update public.konbit_replies set status = 'removed' where author_id = target and status <> 'removed';
  elsif user_action = 'lift' then
    update public.profiles set restricted_until = null, suspended_at = null where id = target;
  else
    raise exception 'invalid_action';
  end if;

  insert into public.moderation_actions (user_id, action, reason, note, until, target_type, target_id, created_by)
  values (target, user_action, action_reason, nullif(trim(action_note), ''), action_until, content_type, content_id, auth.uid())
  returning id into action_id;

  insert into public.notifications (recipient_id, type, moderation_action_id)
  values (target, 'moderation', action_id);
end;
$$;

-- Nommer testeur / modérateur, ou revenir à utilisateur. Admin seulement ;
-- le rôle admin lui-même ne se donne pas depuis l'app.
create function public.set_user_role(target uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'not_allowed'; end if;
  if target = auth.uid() then raise exception 'not_allowed'; end if;
  if new_role not in ('user', 'tester', 'moderator') then raise exception 'invalid_role'; end if;
  update public.profiles set role = new_role where id = target and role <> 'admin';
  if not found then raise exception 'not_found'; end if;
end;
$$;

-- Annonce à tous les comptes (notification + push). Admin seulement.
create function public.send_announcement(announcement_title text, announcement_body text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id bigint;
  sent integer;
begin
  if not private.is_admin() then raise exception 'not_allowed'; end if;

  insert into public.announcements (title, body, created_by)
  values (trim(announcement_title), trim(announcement_body), auth.uid())
  returning id into new_id;

  insert into public.notifications (recipient_id, type, announcement_id)
  select p.id, 'announcement', new_id
  from public.profiles p
  where p.pseudo is not null;
  get diagnostics sent = row_count;

  update public.announcements set recipients = sent where id = new_id;
  return sent;
end;
$$;

-- ─── Lecture pour l'équipe ─────────────────────────────────────────────────

-- File des contenus signalés (ouverts), du plus signalé au moins signalé.
create function public.moderation_queue()
returns table (
  target_type text,
  target_id bigint,
  report_count bigint,
  reasons text[],
  last_reported_at timestamptz,
  body text,
  status text,
  media jsonb,
  konbit_id bigint,
  author_id uuid,
  author_pseudo text,
  author_name text,
  author_avatar text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_moderator() then raise exception 'not_allowed'; end if;
  return query
  select r.target_type, r.target_id, count(*), array_agg(distinct r.reason), max(r.created_at),
         coalesce(k.body, rp.body), coalesce(k.status, rp.status),
         coalesce(k.media, '[]'::jsonb), coalesce(k.id, rp.konbit_id),
         p.id, p.pseudo, p.display_name, p.avatar_path
  from public.abuse_reports r
  left join public.konbits k on r.target_type = 'konbit' and k.id = r.target_id
  left join public.konbit_replies rp on r.target_type = 'reply' and rp.id = r.target_id
  left join public.profiles p on p.id = coalesce(k.author_id, rp.author_id)
  where r.status = 'open'
  group by r.target_type, r.target_id, k.id, k.body, k.status, k.media, rp.body, rp.status, rp.konbit_id,
           p.id, p.pseudo, p.display_name, p.avatar_path
  order by count(*) desc, max(r.created_at) desc
  limit 200;
end;
$$;

-- Fiche d'un compte pour l'équipe. L'e-mail n'est donné qu'à l'admin.
create function public.admin_user(target uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.is_moderator() then raise exception 'not_allowed'; end if;
  select jsonb_build_object(
    'id', p.id,
    'pseudo', p.pseudo,
    'display_name', p.display_name,
    'avatar_path', p.avatar_path,
    'role', p.role,
    'created_at', p.created_at,
    'last_seen_at', p.last_seen_at,
    'restricted_until', p.restricted_until,
    'suspended_at', p.suspended_at,
    'email', case when private.is_admin() then u.email end,
    'konbits', (select count(*) from public.konbits where author_id = p.id),
    'replies', (select count(*) from public.konbit_replies where author_id = p.id),
    'reports_received', (
      select count(*) from public.abuse_reports r
      where (r.target_type = 'konbit' and r.target_id in (select id from public.konbits where author_id = p.id))
         or (r.target_type = 'reply' and r.target_id in (select id from public.konbit_replies where author_id = p.id))
    ),
    'actions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'action', a.action, 'reason', a.reason, 'note', a.note,
        'until', a.until, 'created_at', a.created_at
      ) order by a.created_at desc)
      from public.moderation_actions a where a.user_id = p.id
    ), '[]'::jsonb)
  )
  into result
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.id = target;
  if result is null then raise exception 'not_found'; end if;
  return result;
end;
$$;

-- Chercher un compte par pseudo ou nom.
create function public.admin_search_users(search text)
returns table (id uuid, pseudo text, display_name text, avatar_path text, role text,
               restricted_until timestamptz, suspended_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_moderator() then raise exception 'not_allowed'; end if;
  return query
  select p.id, p.pseudo, p.display_name, p.avatar_path, p.role, p.restricted_until, p.suspended_at
  from public.profiles p
  where p.pseudo is not null
    and (search is null or search = ''
         or p.pseudo ilike '%' || search || '%' or p.display_name ilike '%' || search || '%')
  order by (p.suspended_at is not null or p.restricted_until > now()) desc, p.created_at desc
  limit 50;
end;
$$;

-- Vue d'ensemble (admin seulement). Jours au fuseau d'Haïti.
create function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'America/Port-au-Prince')::date;
begin
  if not private.is_admin() then raise exception 'not_allowed'; end if;
  return jsonb_build_object(
    'accounts', (select count(*) from public.profiles where pseudo is not null),
    'accounts_new_7d', (select count(*) from public.profiles where pseudo is not null and created_at > now() - interval '7 days'),
    'accounts_new_30d', (select count(*) from public.profiles where pseudo is not null and created_at > now() - interval '30 days'),
    'accounts_active_24h', (select count(*) from public.profiles where last_seen_at > now() - interval '24 hours'),
    'accounts_active_7d', (select count(*) from public.profiles where last_seen_at > now() - interval '7 days'),
    'installs_today', (select count(*) from public.app_activity_days where day = today),
    'installs_7d', (select count(distinct install_id) from public.app_activity_days where day > today - 7),
    'installs_30d', (select count(distinct install_id) from public.app_activity_days where day > today - 30),
    'deletions_total', (select count(*) from public.account_deletions),
    'deletions_30d', (select count(*) from public.account_deletions where deleted_at > now() - interval '30 days'),
    'konbits_total', (select count(*) from public.konbits where status = 'visible'),
    'konbits_7d', (select count(*) from public.konbits where created_at > now() - interval '7 days'),
    'replies_7d', (select count(*) from public.konbit_replies where created_at > now() - interval '7 days'),
    'reports_open', (select count(distinct (target_type, target_id)) from public.abuse_reports where status = 'open'),
    'restricted', (select count(*) from public.profiles where restricted_until > now()),
    'suspended', (select count(*) from public.profiles where suspended_at is not null),
    'daily', (
      select jsonb_agg(jsonb_build_object(
        'day', d.day,
        'active', (select count(*) from public.app_activity_days a where a.day = d.day),
        'signups', (select count(*) from public.profiles p
                    where (p.created_at at time zone 'America/Port-au-Prince')::date = d.day)
      ) order by d.day)
      from (select today - i as day from generate_series(0, 13) as i) d
    )
  );
end;
$$;

-- Nombre de contenus en attente (badge du menu admin).
create function public.moderation_pending_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when private.is_moderator()
    then (select count(distinct (target_type, target_id))::integer from public.abuse_reports where status = 'open')
    else 0 end;
$$;

revoke execute on function private.is_admin, private.log_account_deletion from public, anon, authenticated;
-- Appelée par les politiques RLS avec les droits de l'utilisateur connecté.
revoke execute on function private.can_post from public, anon;
grant execute on function private.can_post to authenticated;

revoke execute on function
  public.my_moderation_status, public.moderate_content, public.moderate_user, public.set_user_role,
  public.send_announcement, public.moderation_queue, public.admin_user, public.admin_search_users,
  public.admin_stats, public.moderation_pending_count
from public, anon;

grant execute on function
  public.my_moderation_status, public.moderate_content, public.moderate_user, public.set_user_role,
  public.send_announcement, public.moderation_queue, public.admin_user, public.admin_search_users,
  public.admin_stats, public.moderation_pending_count
to authenticated;
