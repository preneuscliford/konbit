-- Les fonctions utilisées par les règles RLS ne doivent pas être appelables
-- via l'API (/rest/v1/rpc/...) : on les déplace dans un schéma non exposé.
-- enabled_flags() reste dans public, l'app l'appelle volontairement.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

alter function public.has_pseudo() set schema private;
alter function public.is_moderator() set schema private;

-- Index manquants signalés par l'advisor (clés étrangères).
create index abuse_reports_reporter_idx on public.abuse_reports (reporter_id);
create index abuse_reports_handled_by_idx on public.abuse_reports (handled_by);
