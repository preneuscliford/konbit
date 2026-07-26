-- ============================================================
-- PROFILE ENRICHMENT — réseaux sociaux + badge d'innovation
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS innovation_badges TEXT;
