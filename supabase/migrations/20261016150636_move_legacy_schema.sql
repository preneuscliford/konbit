-- Range l'ancien schéma (réseau social de juillet 2026) dans un schéma
-- "legacy" non exposé par l'API, pour libérer public pour Konbit 509 v1.
-- Rien n'est supprimé : les données de test restent consultables dans
-- legacy.*, et pourront être effacées plus tard depuis le SQL Editor
-- (drop schema legacy cascade;). Décision du 2026-10-16.
-- Le trigger on_auth_user_created et public.handle_new_user() restent en
-- place : la migration v1 remplace le corps de la fonction.

create schema if not exists legacy;
revoke all on schema legacy from anon, authenticated;

alter table public.konbit_messages set schema legacy;
alter table public.konbit_updates set schema legacy;
alter table public.reported_konbits set schema legacy;
alter table public.konbit_notifications set schema legacy;
alter table public.konbit_bookmarks set schema legacy;
alter table public.konbit_likes set schema legacy;
alter table public.konbit_comments set schema legacy;
alter table public.konbit_participants set schema legacy;
alter table public.konbits set schema legacy;
alter table public.follows set schema legacy;
alter table public.messages set schema legacy;
alter table public.conversation_participants set schema legacy;
alter table public.conversations set schema legacy;
alter table public.products set schema legacy;
alter table public.events set schema legacy;
alter table public.services set schema legacy;
alter table public.profiles set schema legacy;

alter function public.is_konbit_member(bigint, uuid) set schema legacy;
