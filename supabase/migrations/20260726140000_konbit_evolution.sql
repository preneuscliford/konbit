-- ============================================================
-- ÉVOLUTION DE KONBIT — statuts, mises à jour, participants,
-- discussion réservée aux membres, conditions de participation
-- ============================================================

-- ------------------------------------------------------------
-- 1. Nouveau statut intermédiaire "en_preparation"
-- ------------------------------------------------------------
ALTER TABLE public.konbits DROP CONSTRAINT konbits_status_check;
ALTER TABLE public.konbits ADD CONSTRAINT konbits_status_check
  CHECK (status IN ('nouvelle', 'en_preparation', 'en_cours', 'terminee'));

-- ------------------------------------------------------------
-- 2. Conditions de participation facultatives
-- ------------------------------------------------------------
ALTER TABLE public.konbits
  ADD COLUMN IF NOT EXISTS required_skills TEXT,
  ADD COLUMN IF NOT EXISTS locals_only BOOLEAN DEFAULT false;

-- ------------------------------------------------------------
-- 3. KONBIT UPDATES — mises à jour de progression du créateur
-- ------------------------------------------------------------
CREATE TABLE public.konbit_updates (
  id BIGSERIAL PRIMARY KEY,
  konbit_id BIGINT NOT NULL REFERENCES public.konbits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_konbit_updates_konbit_id ON public.konbit_updates(konbit_id);

ALTER TABLE public.konbit_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Updates are viewable by everyone" ON public.konbit_updates
  FOR SELECT USING (true);
CREATE POLICY "Creator can post updates" ON public.konbit_updates
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.konbits WHERE id = konbit_id AND user_id = auth.uid())
  );
CREATE POLICY "Creator can delete own updates" ON public.konbit_updates
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. KONBIT MESSAGES — discussion de groupe réservée aux membres
-- ------------------------------------------------------------
CREATE TABLE public.konbit_messages (
  id BIGSERIAL PRIMARY KEY,
  konbit_id BIGINT NOT NULL REFERENCES public.konbits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  image_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (content IS NOT NULL OR image_path IS NOT NULL)
);

CREATE INDEX idx_konbit_messages_konbit_id ON public.konbit_messages(konbit_id, created_at);

-- Fonction SECURITY DEFINER : évite la récursion RLS entre konbit_messages
-- et konbit_participants lors de l'évaluation de la policy.
CREATE OR REPLACE FUNCTION public.is_konbit_member(_konbit_id BIGINT, _user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.konbits WHERE id = _konbit_id AND user_id = _user_id
    UNION
    SELECT 1 FROM public.konbit_participants WHERE konbit_id = _konbit_id AND user_id = _user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

ALTER TABLE public.konbit_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view discussion" ON public.konbit_messages
  FOR SELECT USING (public.is_konbit_member(konbit_id, auth.uid()));
CREATE POLICY "Members can send messages" ON public.konbit_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND public.is_konbit_member(konbit_id, auth.uid())
  );
