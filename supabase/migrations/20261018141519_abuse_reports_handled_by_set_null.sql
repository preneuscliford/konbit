-- Un modérateur qui a traité des signalements doit pouvoir supprimer son
-- compte : le signalement reste, seul le lien vers le modérateur disparaît.
alter table public.abuse_reports
  drop constraint abuse_reports_handled_by_fkey,
  add constraint abuse_reports_handled_by_fkey
    foreign key (handled_by) references public.profiles (id) on delete set null;
