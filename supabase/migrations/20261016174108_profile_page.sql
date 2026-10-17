-- Page de profil façon X : nom affiché, bio, photo de profil, photo de
-- couverture. Les photos vont dans le bucket "avatars", dans le dossier de
-- l'utilisateur ; 1 Mo maximum, images seulement.

alter table public.profiles
  add column display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 50),
  add column bio text check (bio is null or char_length(bio) <= 160),
  add column avatar_path text,
  add column cover_path text;

-- Une photo de profil ou de couverture est forcément dans le dossier de son propriétaire.
alter table public.profiles
  add constraint profiles_avatar_path_owner
    check (avatar_path is null or avatar_path ~ ('^' || id::text || '/[A-Za-z0-9._-]{1,80}$')),
  add constraint profiles_cover_path_owner
    check (cover_path is null or cover_path ~ ('^' || id::text || '/[A-Za-z0-9._-]{1,80}$'));

grant update (display_name, bio, avatar_path, cover_path) on public.profiles to authenticated;

update storage.buckets
  set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg', 'image/webp']
  where id = 'avatars';

alter policy "Authenticated users can upload to avatars" on storage.objects
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Le fil renvoie aussi le nom affiché et la photo de l'auteur, et peut être
-- filtré sur un auteur (page de profil). L'ancienne version est renommée.
alter function public.konbit_feed(timestamptz, bigint, integer, bigint) rename to konbit_feed_v2;
revoke execute on function public.konbit_feed_v2(timestamptz, bigint, integer, bigint) from anon, authenticated;

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
  liked boolean
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
                 where kl.konbit_id = k.id and kl.user_id = auth.uid())
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
