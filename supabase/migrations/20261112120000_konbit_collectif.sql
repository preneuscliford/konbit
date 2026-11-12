-- ---------------------------------------------------------------------------
-- Le konbit devient une action collective : un nom, un lieu, une durée, des
-- participants (avec un maximum facultatif). À l'intérieur, les participants
-- publient des messages, y répondent (un niveau de réponses) et les aiment.
--
-- Deux types de publication :
--   • kind = 'konbit'     : action collective (titre, début, fin obligatoires) ;
--   • kind = 'discussion' : simple message, réponses ouvertes à tous.
-- 'idea' et 'project' restent acceptés pour l'app déjà installée.
-- Toutes les nouvelles colonnes sont facultatives pour les autres types :
-- l'ancienne app continue de publier comme avant.
-- ---------------------------------------------------------------------------

alter table public.konbits
  add column title text,
  add column address_detail text,
  add column starts_at timestamptz,
  add column ends_at timestamptz,
  add column max_participants integer;

-- Anciennes règles sur le type et la longueur du texte (konbits et réponses) :
-- retirées d'après leur contenu, quel que soit leur nom, avant d'être remplacées.
do $$
declare
  c record;
begin
  for c in
    select conrelid::regclass as tbl, conname
    from pg_constraint
    where contype = 'c'
      and (
        (conrelid = 'public.konbits'::regclass
          and (pg_get_constraintdef(oid) like '%kind%' or pg_get_constraintdef(oid) like '%btrim(body)%'))
        or (conrelid = 'public.konbit_replies'::regclass and pg_get_constraintdef(oid) like '%btrim(body)%')
      )
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end;
$$;

alter table public.konbits
  add constraint konbits_kind_check check (kind in ('discussion', 'idea', 'project', 'konbit')),
  -- Description d'un konbit : jusqu'à 1000 caractères ; message simple : 280.
  add constraint konbits_body_check check (
    char_length(btrim(body)) between 1 and (case when kind = 'konbit' then 1000 else 280 end)
  ),
  add constraint konbits_title_check check (title is null or char_length(btrim(title)) between 3 and 80),
  add constraint konbits_address_check check (address_detail is null or char_length(btrim(address_detail)) between 1 and 120),
  add constraint konbits_max_check check (max_participants is null or max_participants between 2 and 10000),
  add constraint konbits_collectif_check check (
    kind <> 'konbit'
    or (title is not null and starts_at is not null and ends_at is not null and ends_at > starts_at)
  );

create index konbits_upcoming_idx on public.konbits (ends_at) where kind = 'konbit' and status = 'visible';

grant insert (title, address_detail, starts_at, ends_at, max_participants) on public.konbits to authenticated;

-- Dates raisonnables à la création : début au plus tôt hier, au plus tard
-- dans un an ; durée d'un an au maximum.
create function private.validate_konbit_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind = 'konbit' then
    if new.starts_at < now() - interval '1 day' or new.starts_at > now() + interval '1 year'
       or new.ends_at > new.starts_at + interval '1 year' then
      raise exception 'invalid_dates' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger konbits_validate_dates
  before insert on public.konbits
  for each row execute function private.validate_konbit_dates();

-- ─── Rejoindre un konbit ───────────────────────────────────────────────────
-- Pas après la fin, pas au-delà du maximum. L'organisateur en fait déjà
-- partie : il ne s'inscrit pas lui-même. Verrou sur la ligne du konbit pour
-- que deux inscriptions simultanées ne dépassent pas le maximum.
create function private.check_konbit_join()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  k record;
begin
  select kind, author_id, ends_at, max_participants, participant_count
    into k
    from public.konbits where id = new.konbit_id
    for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if k.kind = 'konbit' then
    if k.author_id = new.user_id then
      raise exception 'already_member' using errcode = 'P0001';
    end if;
    if k.ends_at <= now() then
      raise exception 'konbit_ended' using errcode = 'P0001';
    end if;
    -- Maximum = nombre total de personnes, organisateur compris.
    if k.max_participants is not null and k.participant_count + 1 >= k.max_participants then
      raise exception 'konbit_full' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger konbit_participants_check_join
  before insert on public.konbit_participants
  for each row execute function private.check_konbit_join();

-- ─── Messages et réponses à l'intérieur d'un konbit ────────────────────────
-- Un message (parent_id vide) ou une réponse à un message (parent_id). Une
-- réponse à une réponse se rattache au même message (un seul niveau).

alter table public.konbit_replies
  add column parent_id bigint references public.konbit_replies (id) on delete cascade,
  add column like_count integer not null default 0,
  add constraint konbit_replies_body_check check (char_length(btrim(body)) between 1 and 500);

create index konbit_replies_parent_idx on public.konbit_replies (parent_id) where parent_id is not null;

grant insert (parent_id) on public.konbit_replies to authenticated;

create function private.validate_reply_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent record;
begin
  if new.parent_id is null then
    return new;
  end if;
  select konbit_id, parent_id into parent from public.konbit_replies where id = new.parent_id;
  if not found or parent.konbit_id <> new.konbit_id then
    raise exception 'invalid_parent' using errcode = 'P0001';
  end if;
  -- Réponse à une réponse : rattachée au message d'origine.
  if parent.parent_id is not null then
    new.parent_id := parent.parent_id;
  end if;
  return new;
end;
$$;

create trigger konbit_replies_validate_parent
  before insert on public.konbit_replies
  for each row execute function private.validate_reply_parent();

-- Dans un konbit, seuls l'organisateur et les participants écrivent.
-- Sur un message simple (discussion, ancienne idée ou ancien projet), tout
-- compte avec un pseudo peut répondre, comme avant.
create policy "Membres du konbit" on public.konbit_replies
  as restrictive for insert to authenticated
  with check (exists (
    select 1 from public.konbits k
    where k.id = konbit_id
      and (
        k.kind <> 'konbit'
        or k.author_id = (select auth.uid())
        or exists (
          select 1 from public.konbit_participants p
          where p.konbit_id = k.id and p.user_id = (select auth.uid())
        )
      )
  ));

-- ─── J'aime sur les messages et réponses ───────────────────────────────────

create table public.konbit_reply_likes (
  reply_id bigint not null references public.konbit_replies (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reply_id, user_id)
);

create index konbit_reply_likes_user_idx on public.konbit_reply_likes (user_id);

alter table public.konbit_reply_likes enable row level security;

create policy "J'aime de réponses visibles par tous" on public.konbit_reply_likes
  for select using (true);

create policy "Aimer une réponse avec un pseudo" on public.konbit_reply_likes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.has_pseudo());

create policy "Compte non restreint" on public.konbit_reply_likes
  as restrictive for insert to authenticated with check (private.can_post());

create policy "Retirer son J'aime de réponse" on public.konbit_reply_likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on public.konbit_reply_likes from anon, authenticated;
grant insert (reply_id) on public.konbit_reply_likes to authenticated;
grant delete on public.konbit_reply_likes to authenticated;

create function private.sync_reply_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.konbit_replies set like_count = like_count + 1 where id = new.reply_id;
  else
    update public.konbit_replies set like_count = greatest(like_count - 1, 0) where id = old.reply_id;
  end if;
  return null;
end;
$$;

create trigger konbit_reply_likes_count
  after insert or delete on public.konbit_reply_likes
  for each row execute function private.sync_reply_like_count();

-- ─── Notifications ─────────────────────────────────────────────────────────
-- En plus de l'organisateur, l'auteur du message auquel on répond est prévenu.
create function private.notify_parent_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_author uuid;
  konbit_author uuid;
begin
  if new.parent_id is null then
    return null;
  end if;
  select author_id into parent_author from public.konbit_replies where id = new.parent_id;
  select author_id into konbit_author from public.konbits where id = new.konbit_id;
  -- Pas à soi-même, et pas en double avec la notification de l'organisateur.
  if parent_author is null or parent_author = new.author_id or parent_author = konbit_author then
    return null;
  end if;
  insert into public.notifications (recipient_id, actor_id, type, konbit_id, reply_id)
  values (parent_author, new.author_id, 'new_reply', new.konbit_id, new.id);
  return null;
end;
$$;

create trigger konbit_replies_notify_parent
  after insert on public.konbit_replies
  for each row execute function private.notify_parent_author();

revoke execute on function
  private.validate_konbit_dates, private.check_konbit_join, private.validate_reply_parent,
  private.sync_reply_like_count, private.notify_parent_author
  from public, anon, authenticated;

-- ─── Fil : nouvelles colonnes ──────────────────────────────────────────────
-- Mêmes paramètres qu'avant ; colonnes ajoutées à la fin (l'ancienne app
-- ignore celles qu'elle ne connaît pas).
drop function public.konbit_feed(timestamptz, bigint, integer, bigint, uuid);

create function public.konbit_feed(
  cursor_created_at timestamptz default null,
  cursor_id bigint default null,
  page_size integer default 20,
  only_id bigint default null,
  only_author uuid default null
)
returns table (
  id bigint,
  body text,
  commune_slug text,
  created_at timestamptz,
  kind text,
  media jsonb,
  participant_count integer,
  reply_count integer,
  like_count integer,
  author_id uuid,
  author_pseudo text,
  author_name text,
  author_avatar text,
  joined boolean,
  liked boolean,
  title text,
  address_detail text,
  starts_at timestamptz,
  ends_at timestamptz,
  max_participants integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select k.id, k.body, k.commune_slug, k.created_at, k.kind, k.media,
         k.participant_count, k.reply_count, k.like_count,
         k.author_id, p.pseudo, p.display_name, p.avatar_path,
         exists (select 1 from public.konbit_participants kp
                 where kp.konbit_id = k.id and kp.user_id = auth.uid()),
         exists (select 1 from public.konbit_likes kl
                 where kl.konbit_id = k.id and kl.user_id = auth.uid()),
         k.title, k.address_detail, k.starts_at, k.ends_at, k.max_participants
  from public.konbits k
  join public.profiles p on p.id = k.author_id
  where k.status = 'visible'
    and (only_id is null or k.id = only_id)
    and (only_author is null or k.author_id = only_author)
    and (cursor_created_at is null or (k.created_at, k.id) < (cursor_created_at, cursor_id))
  order by k.created_at desc, k.id desc
  limit least(greatest(page_size, 1), 50);
$$;

revoke execute on function public.konbit_feed(timestamptz, bigint, integer, bigint, uuid) from public;
grant execute on function public.konbit_feed(timestamptz, bigint, integer, bigint, uuid) to anon, authenticated;
