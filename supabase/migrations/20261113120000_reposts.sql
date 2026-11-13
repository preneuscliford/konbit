-- ---------------------------------------------------------------------------
-- Repost (comme sur X) : republier un pòs ou un konbit, sans texte (repost
-- simple, annulable) ou avec une légende (texte, emoji, photos). Un repost est
-- un pòs (kind = 'discussion') qui pointe vers l'original.
-- ---------------------------------------------------------------------------

alter table public.konbits
  add column repost_of bigint references public.konbits (id) on delete set null,
  -- Reste vrai si l'original est supprimé (repost_of passe à vide).
  add column is_repost boolean not null default false,
  add column repost_count integer not null default 0;

create index konbits_repost_of_idx on public.konbits (repost_of) where repost_of is not null;

-- Un seul repost simple (sans texte) par personne et par publication.
create unique index konbits_one_plain_repost
  on public.konbits (author_id, repost_of)
  where is_repost and btrim(body) = '';

-- Texte vide permis pour un repost ; sinon les règles d'avant.
alter table public.konbits
  drop constraint konbits_body_check,
  add constraint konbits_body_check check (
    char_length(btrim(body)) between (case when is_repost then 0 else 1 end)
      and (case when kind = 'konbit' then 1000 else 280 end)
  );

grant insert (repost_of) on public.konbits to authenticated;

-- À la création : l'original doit être visible ; un repost simple d'un repost
-- simple pointe vers l'original ; un repost est toujours un pòs.
create function private.prepare_repost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  original record;
begin
  if new.repost_of is null then
    new.is_repost := false;
    return new;
  end if;
  select id, repost_of, is_repost, body, status into original from public.konbits where id = new.repost_of;
  if not found or original.status <> 'visible' then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if original.is_repost and btrim(original.body) = '' and original.repost_of is not null then
    new.repost_of := original.repost_of;
  end if;
  new.is_repost := true;
  new.kind := 'discussion';
  return new;
end;
$$;

create trigger konbits_prepare_repost
  before insert on public.konbits
  for each row execute function private.prepare_repost();

create function private.sync_repost_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.repost_of is not null then
    update public.konbits set repost_count = repost_count + 1 where id = new.repost_of;
  elsif tg_op = 'DELETE' and old.repost_of is not null then
    update public.konbits set repost_count = greatest(repost_count - 1, 0) where id = old.repost_of;
  end if;
  return null;
end;
$$;

create trigger konbits_repost_count
  after insert or delete on public.konbits
  for each row execute function private.sync_repost_count();

revoke execute on function private.prepare_repost, private.sync_repost_count from public, anon, authenticated;

-- ─── Fil : repost, compteur et publication d'origine ───────────────────────
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
  -- L'utilisateur a-t-il fait un repost simple de cette publication ?
  reposted boolean,
  -- Publication d'origine d'un repost (vide si supprimée ou masquée).
  original jsonb
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
            where o.id = k.repost_of and o.status = 'visible')
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
