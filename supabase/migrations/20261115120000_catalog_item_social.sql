-- ---------------------------------------------------------------------------
-- Page d'un article du katalòg : J'aime (publics) et vues (privées, pour le
-- propriétaire seulement).
--
-- Une vue compte quand la page de l'article est ouverte, ou quand sa carte
-- reste visible au moins à moitié pendant 1 seconde dans le katalòg (norme
-- IAB/MRC). Chaque personne (compte, ou appareil pour un visiteur sans compte)
-- compte au plus une fois par article et par jour (heure d'Haïti). Le
-- propriétaire ne se compte jamais.
-- ---------------------------------------------------------------------------

-- ─── J'aime ────────────────────────────────────────────────────────────────
alter table public.business_items
  add column like_count integer not null default 0;

-- Un J'aime ne compte pas comme une modification de l'article.
drop trigger business_items_touch on public.business_items;
create trigger business_items_touch
  before update on public.business_items
  for each row
  when (old.like_count is not distinct from new.like_count)
  execute function private.touch_updated_at();

create table public.business_item_likes (
  item_id bigint not null references public.business_items (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

create index business_item_likes_user_idx on public.business_item_likes (user_id, created_at desc);

alter table public.business_item_likes enable row level security;

create policy "J'aime visibles par tous"
  on public.business_item_likes for select
  using (true);

create policy "Aimer un article"
  on public.business_item_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_post());

create policy "Retirer son J'aime"
  on public.business_item_likes for delete to authenticated
  using (user_id = (select auth.uid()));

grant select on public.business_item_likes to anon, authenticated;
grant insert (item_id), delete on public.business_item_likes to authenticated;

create function private.sync_item_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.business_items set like_count = like_count + 1 where id = new.item_id;
  else
    update public.business_items set like_count = greatest(like_count - 1, 0) where id = old.item_id;
  end if;
  return null;
end;
$$;

create trigger business_item_likes_count
  after insert or delete on public.business_item_likes
  for each row execute function private.sync_item_like_count();

revoke execute on function private.sync_item_like_count from public, anon, authenticated;

-- ─── Vues (privées) ────────────────────────────────────────────────────────
-- Une ligne par article, personne et jour. Personne ne lit la table
-- directement : on écrit par record_item_views, on lit par item_view_stats.
create table public.business_item_views (
  item_id bigint not null references public.business_items (id) on delete cascade,
  -- uuid du compte, ou « anon:<id de l'appareil> » pour un visiteur sans compte.
  viewer text not null,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (item_id, viewer, day)
);

create index business_item_views_item_day_idx on public.business_item_views (item_id, day);

alter table public.business_item_views enable row level security;
-- Aucune règle : ni lecture ni écriture directes.

-- Enregistre des vues (page ouverte, ou cartes vues 1 s). Ignore les articles
-- masqués et ceux du visiteur lui-même ; au plus une fois par jour et par
-- personne. Renvoie le nombre de vues nouvelles.
create function public.record_item_views(items bigint[], device text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  who text;
  added integer;
begin
  if me is not null then
    who := me::text;
  elsif device ~ '^[A-Za-z0-9-]{16,64}$' then
    who := 'anon:' || device;
  else
    return 0;
  end if;
  if items is null or cardinality(items) = 0 or cardinality(items) > 50 then
    return 0;
  end if;

  insert into public.business_item_views (item_id, viewer, day)
  select distinct i.id, who, (now() at time zone 'America/Port-au-Prince')::date
  from public.business_items i
  join public.businesses b on b.id = i.business_id
  where i.id = any (items)
    and i.status = 'visible'
    and b.status = 'visible'
    and (me is null or b.owner_id <> me)
  on conflict do nothing;

  get diagnostics added = row_count;
  return added;
end;
$$;

revoke execute on function public.record_item_views(bigint[], text) from public;
grant execute on function public.record_item_views(bigint[], text) to anon, authenticated;

-- Statistiques des articles d'une fiche : pour son propriétaire seulement.
create function public.item_view_stats(target_business bigint)
returns table (item_id bigint, views_total bigint, views_7d bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id,
         count(v.item_id),
         count(v.item_id) filter (
           where v.day > (now() at time zone 'America/Port-au-Prince')::date - 7)
  from public.business_items i
  join public.businesses b on b.id = i.business_id
  left join public.business_item_views v on v.item_id = i.id
  where i.business_id = target_business
    and b.owner_id = auth.uid()
  group by i.id;
$$;

revoke execute on function public.item_view_stats(bigint) from public;
grant execute on function public.item_view_stats(bigint) to authenticated;
