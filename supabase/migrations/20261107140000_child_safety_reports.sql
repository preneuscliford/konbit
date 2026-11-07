-- Sécurité des enfants (règles Google Play pour les réseaux sociaux) : motif
-- de signalement dédié, et masquage immédiat dès le premier signalement de ce
-- type, sans attendre les 3 signalements habituels.

alter table public.abuse_reports
  drop constraint abuse_reports_reason_check,
  add constraint abuse_reports_reason_check
    check (reason in ('spam', 'harassment', 'hate', 'violence', 'child_safety', 'false_info', 'other'));

alter table public.moderation_actions
  drop constraint moderation_actions_reason_check,
  add constraint moderation_actions_reason_check
    check (reason in ('spam', 'harassment', 'hate', 'violence', 'child_safety', 'false_info', 'other'));

create or replace function public.auto_hide_reported()
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

  -- Mise en danger d'enfants : masqué tout de suite, examen prioritaire.
  if reporters >= 3 or new.reason = 'child_safety' then
    if new.target_type = 'konbit' then
      update public.konbits set status = 'hidden' where id = new.target_id and status = 'visible';
    else
      update public.konbit_replies set status = 'hidden' where id = new.target_id and status = 'visible';
    end if;
  end if;
  return null;
end;
$$;
