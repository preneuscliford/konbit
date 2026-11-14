-- ---------------------------------------------------------------------------
-- Fiches business dans le fil : J'aime, repost simple et « Site » (citation
-- avec légende), comme pour un pòs. Un repost de fiche est un pòs
-- (kind = 'discussion', is_repost) qui pointe vers la fiche (business_id).
-- ---------------------------------------------------------------------------

-- ─── Compteurs sur la fiche ────────────────────────────────────────────────
alter table public.businesses
  add column like_count integer not null default 0,
  add column repost_count integer not null default 0;

-- Un J'aime ou un repost ne compte pas comme une modification de la fiche
-- (updated_at sert au plan du site).
drop trigger businesses_touch on public.businesses;
create trigger businesses_touch
  before update on public.businesses
  for each row
  when (old.like_count is not distinct from new.like_count
        and old.repost_count is not distinct from new.repost_count)
  execute function private.touch_updated_at();

-- ─── J'aime ────────────────────────────────────────────────────────────────
create table public.business_likes (
  business_id bigint not null references public.businesses (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index business_likes_user_idx on public.business_likes (user_id, created_at desc);

alter table public.business_likes enable row level security;

create policy "J'aime visibles par tous"
  on public.business_likes for select
  using (true);

create policy "Aimer une fiche"
  on public.business_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_post());

create policy "Retirer son J'aime"
  on public.business_likes for delete to authenticated
  using (user_id = (select auth.uid()));

grant select on public.business_likes to anon, authenticated;
grant insert (business_id), delete on public.business_likes to authenticated;

create function private.sync_business_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.businesses set like_count = like_count + 1 where id = new.business_id;
  else
    update public.businesses set like_count = greatest(like_count - 1, 0) where id = old.business_id;
  end if;
  return null;
end;
$$;

create trigger business_likes_count
  after insert or delete on public.business_likes
  for each row execute function private.sync_business_like_count();

-- ─── Repost / citation d'une fiche ─────────────────────────────────────────
alter table public.konbits
  add column business_id bigint references public.businesses (id) on delete set null;

create index konbits_business_id_idx on public.konbits (business_id) where business_id is not null;

-- Un seul repost simple (sans texte) par personne et par fiche.
create unique index konbits_one_plain_business_repost
  on public.konbits (author_id, business_id)
  where is_repost and btrim(body) = '' and business_id is not null;

grant insert (business_id) on public.konbits to authenticated;

-- À la création : la publication ou la fiche d'origine doit être visible ;
-- un repost simple d'un repost simple pointe vers l'original (pòs ou fiche) ;
-- un repost est toujours un pòs.
create or replace function private.prepare_repost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  original record;
begin
  if new.repost_of is null and new.business_id is null then
    new.is_repost := false;
    return new;
  end if;
  if new.repost_of is not null and new.business_id is not null then
    raise exception 'invalid_repost' using errcode = 'P0001';
  end if;
  if new.business_id is not null then
    if not exists (select 1 from public.businesses b where b.id = new.business_id and b.status = 'visible') then
      raise exception 'not_found' using errcode = 'P0001';
    end if;
  else
    select id, repost_of, business_id, is_repost, body, status into original
      from public.konbits where id = new.repost_of;
    if not found or original.status <> 'visible' then
      raise exception 'not_found' using errcode = 'P0001';
    end if;
    if original.is_repost and btrim(original.body) = '' then
      if original.repost_of is not null then
        new.repost_of := original.repost_of;
      elsif original.business_id is not null then
        new.repost_of := null;
        new.business_id := original.business_id;
      end if;
    end if;
  end if;
  new.is_repost := true;
  new.kind := 'discussion';
  return new;
end;
$$;

create or replace function private.sync_repost_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.repost_of is not null then
      update public.konbits set repost_count = repost_count + 1 where id = new.repost_of;
    elsif new.business_id is not null then
      update public.businesses set repost_count = repost_count + 1 where id = new.business_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.repost_of is not null then
      update public.konbits set repost_count = greatest(repost_count - 1, 0) where id = old.repost_of;
    elsif old.business_id is not null then
      update public.businesses set repost_count = greatest(repost_count - 1, 0) where id = old.business_id;
    end if;
  end if;
  return null;
end;
$$;

revoke execute on function private.prepare_repost, private.sync_repost_count,
  private.sync_business_like_count from public, anon, authenticated;

-- ─── Fil : fiche d'origine d'un repost ─────────────────────────────────────
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
  max_participants integer,
  repost_of bigint,
  is_repost boolean,
  repost_count integer,
  reposted boolean,
  original jsonb,
  business_id bigint,
  -- Fiche reprise (vide si supprimée ou masquée), avec l'état de l'utilisateur.
  business jsonb
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
         k.title, k.address_detail, k.starts_at, k.ends_at, k.max_participants,
         k.repost_of, k.is_repost, k.repost_count,
         exists (select 1 from public.konbits r
                 where r.repost_of = k.id and r.author_id = auth.uid()
                   and r.is_repost and btrim(r.body) = '' and r.status = 'visible'),
         (select jsonb_build_object(
                   'id', o.id, 'body', o.body, 'kind', o.kind, 'title', o.title,
                   'commune_slug', o.commune_slug, 'address_detail', o.address_detail,
                   'starts_at', o.starts_at, 'ends_at', o.ends_at, 'max_participants', o.max_participants,
                   'media', o.media, 'created_at', o.created_at,
                   'participant_count', o.participant_count, 'reply_count', o.reply_count,
                   'like_count', o.like_count, 'repost_count', o.repost_count,
                   'author_id', o.author_id, 'author_pseudo', op.pseudo,
                   'author_name', op.display_name, 'author_avatar', op.avatar_path)
            from public.konbits o
            join public.profiles op on op.id = o.author_id
            where o.id = k.repost_of and o.status = 'visible'),
         k.business_id,
         (select jsonb_build_object(
                   'id', b.id, 'slug', b.slug, 'name', b.name, 'category', b.category,
                   'commune_slug', b.commune_slug, 'description', b.description,
                   'logo_path', b.logo_path, 'cover_path', b.cover_path,
                   'verified', b.verified, 'owner_id', b.owner_id,
                   'like_count', b.like_count, 'repost_count', b.repost_count,
                   'liked', exists (select 1 from public.business_likes bl
                                    where bl.business_id = b.id and bl.user_id = auth.uid()),
                   'reposted', exists (select 1 from public.konbits r
                                       where r.business_id = b.id and r.author_id = auth.uid()
                                         and r.is_repost and btrim(r.body) = '' and r.status = 'visible'))
            from public.businesses b
            where b.id = k.business_id and b.status = 'visible')
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
