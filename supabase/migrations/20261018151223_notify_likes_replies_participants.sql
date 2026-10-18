-- Notifier l'auteur d'un konbit quand quelqu'un l'aime, y répond ou dit
-- « Mwen ladan ». Jamais pour ses propres actions ; J'aime et participation
-- une seule fois par personne et par konbit (pas de spam aimer/retirer).

alter table public.notifications
  drop constraint notifications_type_check,
  add constraint notifications_type_check check (type in (
    'new_konbit', 'new_follower', 'moderation', 'announcement',
    'new_like', 'new_reply', 'new_participant'
  )),
  add column reply_id bigint references public.konbit_replies (id) on delete cascade;

create index notifications_reply_idx on public.notifications (reply_id);

create function private.notify_konbit_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid;
  actor uuid;
  kind text;
begin
  select k.author_id into author from public.konbits k where k.id = new.konbit_id and k.status = 'visible';
  if tg_table_name = 'konbit_replies' then
    actor := new.author_id;
    kind := 'new_reply';
  elsif tg_table_name = 'konbit_likes' then
    actor := new.user_id;
    kind := 'new_like';
  else
    actor := new.user_id;
    kind := 'new_participant';
  end if;

  if author is null or author = actor then
    return null;
  end if;

  if kind = 'new_reply' then
    insert into public.notifications (recipient_id, actor_id, type, konbit_id, reply_id)
    values (author, actor, kind, new.konbit_id, new.id);
  elsif not exists (
    select 1 from public.notifications
    where recipient_id = author and actor_id = actor and type = kind and konbit_id = new.konbit_id
  ) then
    insert into public.notifications (recipient_id, actor_id, type, konbit_id)
    values (author, actor, kind, new.konbit_id);
  end if;
  return null;
end;
$$;

create trigger konbit_replies_notify_author
  after insert on public.konbit_replies
  for each row execute function private.notify_konbit_author();

create trigger konbit_likes_notify_author
  after insert on public.konbit_likes
  for each row execute function private.notify_konbit_author();

create trigger konbit_participants_notify_author
  after insert on public.konbit_participants
  for each row execute function private.notify_konbit_author();

revoke execute on function private.notify_konbit_author from public, anon, authenticated;
