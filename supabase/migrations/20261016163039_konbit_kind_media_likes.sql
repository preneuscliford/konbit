-- Konbit : type (discussion par défaut, idée, projet), jusqu'à 2 images,
-- bouton J'aime. Images compressées par l'app (1280 px, JPEG) ; le serveur
-- refuse tout fichier > 1 Mo et tout chemin hors du dossier de l'auteur.

alter table public.konbits
  add column kind text not null default 'discussion' check (kind in ('discussion', 'idea', 'project')),
  add column media jsonb not null default '[]'::jsonb,
  add column like_count integer not null default 0;

grant insert (kind, media) on public.konbits to authenticated;

-- media = [{ "type": "image", "path": "<author_id>/<fichier>.jpg", "width": 1280, "height": 960 }]
create function private.validate_konbit_media()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  item jsonb;
begin
  if jsonb_typeof(new.media) <> 'array' or jsonb_array_length(new.media) > 2 then
    raise exception 'invalid_media' using errcode = 'P0001';
  end if;
  for item in select value from jsonb_array_elements(new.media) loop
    if item ->> 'type' is distinct from 'image'
       or coalesce(item ->> 'path', '') !~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$'
       or split_part(item ->> 'path', '/', 1) <> new.author_id::text then
      raise exception 'invalid_media' using errcode = 'P0001';
    end if;
  end loop;
  return new;
end;
$$;

create trigger konbits_validate_media
  before insert on public.konbits
  for each row execute function private.validate_konbit_media();

-- J'aime
create table public.konbit_likes (
  konbit_id bigint not null references public.konbits (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (konbit_id, user_id)
);

create index konbit_likes_user_idx on public.konbit_likes (user_id);

alter table public.konbit_likes enable row level security;

create policy "J'aime visibles par tous" on public.konbit_likes
  for select using (true);

create policy "Aimer avec un pseudo" on public.konbit_likes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.has_pseudo()
    and exists (select 1 from public.konbits k where k.id = konbit_id and k.status = 'visible')
  );

create policy "Retirer son J'aime" on public.konbit_likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on public.konbit_likes from anon, authenticated;
grant insert (konbit_id) on public.konbit_likes to authenticated;
grant delete on public.konbit_likes to authenticated;

create function private.sync_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.konbits set like_count = like_count + 1 where id = new.konbit_id;
  else
    update public.konbits set like_count = greatest(like_count - 1, 0) where id = old.konbit_id;
  end if;
  return null;
end;
$$;

create trigger konbit_likes_count
  after insert or delete on public.konbit_likes
  for each row execute function private.sync_like_count();

-- Le fil renvoie maintenant type, images, J'aime. L'ancienne version est
-- renommée (pas supprimée) et n'est plus appelable.
alter function public.konbit_feed(timestamptz, bigint, integer, bigint) rename to konbit_feed_v1;
revoke execute on function public.konbit_feed_v1(timestamptz, bigint, integer, bigint) from anon, authenticated;

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
  kind text,
  media jsonb,
  participant_count integer,
  reply_count integer,
  like_count integer,
  author_id uuid,
  author_pseudo text,
  joined boolean,
  liked boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select k.id, k.body, k.commune_slug, k.created_at, k.kind, k.media,
         k.participant_count, k.reply_count, k.like_count,
         k.author_id, p.pseudo,
         exists (select 1 from public.konbit_participants kp
                 where kp.konbit_id = k.id and kp.user_id = auth.uid()),
         exists (select 1 from public.konbit_likes kl
                 where kl.konbit_id = k.id and kl.user_id = auth.uid())
  from public.konbits k
  join public.profiles p on p.id = k.author_id
  where k.status = 'visible'
    and (only_id is null or k.id = only_id)
    and (cursor_created_at is null or (k.created_at, k.id) < (cursor_created_at, cursor_id))
  order by k.created_at desc, k.id desc
  limit least(greatest(page_size, 1), 50);
$$;

revoke execute on function public.konbit_feed(timestamptz, bigint, integer, bigint) from public;
grant execute on function public.konbit_feed(timestamptz, bigint, integer, bigint) to anon, authenticated;

-- Les deux options deviennent actives pour tout le monde (désactivables ici).
update public.feature_flags
  set key = 'compose.media', description = 'Joindre jusqu''à 2 images à un konbit', enabled_for_all = true
  where key = 'compose.photo';
update public.feature_flags
  set key = 'compose.kind', description = 'Choisir le type : discussion, idée, projet', enabled_for_all = true
  where key = 'compose.category';

-- Stockage : 1 Mo maximum, images seulement, chacun écrit dans son dossier.
update storage.buckets
  set file_size_limit = 1048576, allowed_mime_types = array['image/jpeg', 'image/webp']
  where id = 'konbit-media';

alter policy "Authenticated users can upload to konbit-media" on storage.objects
  to authenticated
  with check (bucket_id = 'konbit-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
