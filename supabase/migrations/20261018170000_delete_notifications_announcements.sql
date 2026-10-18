-- Chacun peut effacer ses propres notifications (annonces comprises).
create policy "Effacer ses notifications" on public.notifications
  for delete to authenticated
  using (recipient_id = (select auth.uid()));

grant delete on public.notifications to authenticated;

-- Supprimer une annonce : elle disparaît aussi des notifications de tout le
-- monde (notifications.announcement_id est en ON DELETE CASCADE). Admin seulement.
create function public.delete_announcement(target bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'not_allowed'; end if;
  delete from public.announcements where id = target;
  if not found then raise exception 'not_found'; end if;
end;
$$;

revoke execute on function public.delete_announcement from public, anon;
grant execute on function public.delete_announcement to authenticated;
