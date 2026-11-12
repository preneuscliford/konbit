-- ---------------------------------------------------------------------------
-- Fiches business et katalòg (produits et services).
-- Une fiche par membre pour commencer. La vente se fait directement entre les
-- gens (WhatsApp, appel) : pas de paiement dans Konbit 509.
-- Photos : bucket konbit-media, dans le dossier du propriétaire (1 Mo max).
-- ---------------------------------------------------------------------------

create table public.businesses (
  id bigint generated always as identity primary key,
  -- Toujours le compte qui crée la fiche (pas de colonne owner_id à fournir).
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Adresse de la fiche : /b/<slug>
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  category text not null check (category in (
    'food', 'retail', 'beauty', 'health', 'education', 'construction',
    'transport', 'tech', 'crafts', 'agriculture', 'services', 'other'
  )),
  commune_slug text not null check (commune_slug ~ '^[a-z0-9-]{2,60}$'),
  address text check (address is null or char_length(btrim(address)) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  phone text check (phone is null or phone ~ '^\+?[0-9 ]{7,20}$'),
  whatsapp text check (whatsapp is null or whatsapp ~ '^\+?[0-9 ]{7,20}$'),
  email text check (email is null or (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' and char_length(email) <= 120)),
  website text check (website is null or (website ~ '^https?://[^\s]+$' and char_length(website) <= 200)),
  -- Texte libre : « Lendi–Samdi, 8è–6è »
  hours text check (hours is null or char_length(hours) <= 200),
  logo_path text,
  cover_path text,
  status text not null default 'visible' check (status in ('visible', 'hidden', 'removed')),
  -- Badge « Verifye » : donné seulement par l'équipe.
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_logo_in_owner_folder
    check (logo_path is null or logo_path ~ ('^' || owner_id::text || '/[A-Za-z0-9._-]{1,80}$')),
  constraint businesses_cover_in_owner_folder
    check (cover_path is null or cover_path ~ ('^' || owner_id::text || '/[A-Za-z0-9._-]{1,80}$'))
);

-- Une fiche par membre (à assouplir plus tard).
create unique index businesses_one_per_owner on public.businesses (owner_id);
create index businesses_directory_idx on public.businesses (category, commune_slug) where status = 'visible';
create index businesses_recent_idx on public.businesses (created_at desc) where status = 'visible';

alter table public.businesses enable row level security;

create policy "Fiches visibles par tous" on public.businesses
  for select to anon, authenticated
  using (status = 'visible' or owner_id = (select auth.uid()) or private.is_moderator());

create policy "Créer sa fiche avec un pseudo" on public.businesses
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.has_pseudo());

create policy "Compte non restreint" on public.businesses
  as restrictive for insert to authenticated with check (private.can_post());

create policy "Modifier sa fiche" on public.businesses
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Supprimer sa fiche" on public.businesses
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Le propriétaire ne touche ni au statut, ni au badge, ni au propriétaire.
revoke insert, update, delete on public.businesses from anon, authenticated;
grant insert (slug, name, category, commune_slug, address, description, phone, whatsapp, email, website, hours, logo_path, cover_path)
  on public.businesses to authenticated;
grant update (slug, name, category, commune_slug, address, description, phone, whatsapp, email, website, hours, logo_path, cover_path)
  on public.businesses to authenticated;
grant delete on public.businesses to authenticated;

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_touch
  before update on public.businesses
  for each row execute function private.touch_updated_at();

-- ─── Katalòg ───────────────────────────────────────────────────────────────

create table public.business_items (
  id bigint generated always as identity primary key,
  business_id bigint not null references public.businesses (id) on delete cascade,
  kind text not null default 'product' check (kind in ('product', 'service')),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  description text check (description is null or char_length(description) <= 300),
  -- Prix vide : « sou demann ».
  price numeric(12, 2) check (price is null or (price >= 0 and price < 1000000000)),
  currency text not null default 'HTG' check (currency in ('HTG', 'USD')),
  -- [{ "type": "image", "path": "<owner_id>/<fichier>.jpg", "width": 1280, "height": 960 }], 3 max.
  photos jsonb not null default '[]'::jsonb,
  available boolean not null default true,
  position integer not null default 0,
  status text not null default 'visible' check (status in ('visible', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index business_items_business_idx on public.business_items (business_id, position, id);
create index business_items_market_idx on public.business_items (created_at desc) where status = 'visible';

alter table public.business_items enable row level security;

create policy "Katalòg visible par tous" on public.business_items
  for select to anon, authenticated
  using (
    (status = 'visible' and exists (
      select 1 from public.businesses b where b.id = business_id and b.status = 'visible'
    ))
    or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid()))
    or private.is_moderator()
  );

create policy "Ajouter à son katalòg" on public.business_items
  for insert to authenticated
  with check (exists (
    select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())
  ));

create policy "Compte non restreint" on public.business_items
  as restrictive for insert to authenticated with check (private.can_post());

create policy "Modifier son katalòg" on public.business_items
  for update to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

create policy "Retirer de son katalòg" on public.business_items
  for delete to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

revoke insert, update, delete on public.business_items from anon, authenticated;
grant insert (business_id, kind, name, description, price, currency, photos, available, position)
  on public.business_items to authenticated;
grant update (kind, name, description, price, currency, photos, available, position)
  on public.business_items to authenticated;
grant delete on public.business_items to authenticated;

create trigger business_items_touch
  before update on public.business_items
  for each row execute function private.touch_updated_at();

-- Photos dans le dossier du propriétaire, 3 au plus ; 100 articles par fiche ;
-- anti-spam : 30 ajouts par heure.
create function private.validate_business_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  item jsonb;
begin
  select owner_id into owner from public.businesses where id = new.business_id;
  if owner is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if jsonb_typeof(new.photos) <> 'array' or jsonb_array_length(new.photos) > 3 then
    raise exception 'invalid_media' using errcode = 'P0001';
  end if;
  for item in select value from jsonb_array_elements(new.photos) loop
    if item ->> 'type' is distinct from 'image'
       or coalesce(item ->> 'path', '') !~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$'
       or split_part(item ->> 'path', '/', 1) <> owner::text then
      raise exception 'invalid_media' using errcode = 'P0001';
    end if;
  end loop;

  if tg_op = 'INSERT' then
    if (select count(*) from public.business_items where business_id = new.business_id) >= 100 then
      raise exception 'catalog_full' using errcode = 'P0001';
    end if;
    if (select count(*) from public.business_items i
        join public.businesses b on b.id = i.business_id
        where b.owner_id = owner and i.created_at > now() - interval '1 hour') >= 30 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger business_items_validate
  before insert or update on public.business_items
  for each row execute function private.validate_business_item();

revoke execute on function private.validate_business_item, private.touch_updated_at from public, anon, authenticated;

-- ─── Stockage ──────────────────────────────────────────────────────────────

-- Chacun peut supprimer ses propres fichiers (photos d'un konbit effacé,
-- ancien logo…). Sans cette règle, ils restaient en ligne.
create policy "Owners delete their konbit-media files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'konbit-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ─── Signalements et modération ────────────────────────────────────────────

alter table public.abuse_reports
  drop constraint abuse_reports_target_type_check,
  add constraint abuse_reports_target_type_check
    check (target_type in ('konbit', 'reply', 'business', 'business_item'));

alter table public.moderation_actions
  drop constraint moderation_actions_target_type_check,
  add constraint moderation_actions_target_type_check
    check (target_type in ('konbit', 'reply', 'business', 'business_item'));

-- 3 signalements (ou mise en danger d'enfants) : masqué en attendant l'équipe.
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

  if reporters >= 3 or new.reason = 'child_safety' then
    if new.target_type = 'konbit' then
      update public.konbits set status = 'hidden' where id = new.target_id and status = 'visible';
    elsif new.target_type = 'reply' then
      update public.konbit_replies set status = 'hidden' where id = new.target_id and status = 'visible';
    elsif new.target_type = 'business' then
      update public.businesses set status = 'hidden' where id = new.target_id and status = 'visible';
    elsif new.target_type = 'business_item' then
      update public.business_items set status = 'hidden' where id = new.target_id and status = 'visible';
    end if;
  end if;
  return null;
end;
$$;

create or replace function public.moderate_content(content_type text, content_id bigint, decision text, decision_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid;
  action_id bigint;
  new_status text;
begin
  if not private.is_moderator() then raise exception 'not_allowed'; end if;
  if decision not in ('remove', 'restore') then raise exception 'invalid_decision'; end if;
  new_status := case decision when 'remove' then 'removed' else 'visible' end;

  if content_type = 'konbit' then
    update public.konbits set status = new_status where id = content_id returning author_id into author;
  elsif content_type = 'reply' then
    update public.konbit_replies set status = new_status where id = content_id returning author_id into author;
  elsif content_type = 'business' then
    update public.businesses set status = new_status where id = content_id returning owner_id into author;
  elsif content_type = 'business_item' then
    update public.business_items i set status = new_status
    from public.businesses b
    where i.id = content_id and b.id = i.business_id
    returning b.owner_id into author;
  else
    raise exception 'invalid_type';
  end if;
  if author is null then raise exception 'not_found'; end if;

  update public.abuse_reports
  set status = case decision when 'remove' then 'actioned' else 'dismissed' end,
      handled_by = auth.uid()
  where target_type = content_type and target_id = content_id and status = 'open';

  insert into public.moderation_actions (user_id, action, reason, target_type, target_id, created_by)
  values (author, decision || '_content', decision_reason, content_type, content_id, auth.uid())
  returning id into action_id;

  -- Seul un retrait est notifié à l'auteur.
  if decision = 'remove' then
    insert into public.notifications (recipient_id, type, moderation_action_id)
    values (author, 'moderation', action_id);
  end if;
end;
$$;

-- File de modération : les fiches et articles signalés apparaissent avec leur
-- nom (+ description) comme texte et leur propriétaire comme auteur.
create or replace function public.moderation_queue()
returns table (
  target_type text,
  target_id bigint,
  report_count bigint,
  reasons text[],
  last_reported_at timestamptz,
  body text,
  status text,
  media jsonb,
  konbit_id bigint,
  author_id uuid,
  author_pseudo text,
  author_name text,
  author_avatar text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_moderator() then raise exception 'not_allowed'; end if;
  return query
  select r.target_type, r.target_id, count(*), array_agg(distinct r.reason), max(r.created_at),
         coalesce(
           k.body, rp.body,
           b.name || coalesce(E'\n' || b.description, ''),
           bi.name || coalesce(E'\n' || bi.description, '')
         ),
         coalesce(k.status, rp.status, b.status, bi.status),
         coalesce(k.media, bi.photos, '[]'::jsonb),
         coalesce(k.id, rp.konbit_id),
         p.id, p.pseudo, p.display_name, p.avatar_path
  from public.abuse_reports r
  left join public.konbits k on r.target_type = 'konbit' and k.id = r.target_id
  left join public.konbit_replies rp on r.target_type = 'reply' and rp.id = r.target_id
  left join public.businesses b on r.target_type = 'business' and b.id = r.target_id
  left join public.business_items bi on r.target_type = 'business_item' and bi.id = r.target_id
  left join public.businesses bo on bo.id = bi.business_id
  left join public.profiles p on p.id = coalesce(k.author_id, rp.author_id, b.owner_id, bo.owner_id)
  where r.status = 'open'
  group by r.target_type, r.target_id, k.id, k.body, k.status, k.media, rp.body, rp.status, rp.konbit_id,
           b.name, b.description, b.status, bi.name, bi.description, bi.status, bi.photos,
           p.id, p.pseudo, p.display_name, p.avatar_path
  order by count(*) desc, max(r.created_at) desc
  limit 200;
end;
$$;

-- Badge « Verifye » : réservé à l'admin.
create function public.set_business_verified(target bigint, value boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'not_allowed'; end if;
  update public.businesses set verified = value where id = target;
  if not found then raise exception 'not_found'; end if;
end;
$$;

revoke execute on function public.set_business_verified from public, anon;
grant execute on function public.set_business_verified to authenticated;
