-- ============================================================
-- KONBIT PIVOT — remplacement complet du concept "post" par "Konbit"
-- ============================================================

-- ------------------------------------------------------------
-- 0. Nettoyage : suppression des tables liées à l'ancien concept "post"
-- ------------------------------------------------------------
DROP TABLE IF EXISTS public.post_hashtags CASCADE;
DROP TABLE IF EXISTS public.hashtags CASCADE;
DROP TABLE IF EXISTS public.posts_notifications CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.post_likes CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
-- (reported_posts n'a jamais été migrée : rien à supprimer)

-- ------------------------------------------------------------
-- 1. KONBITS — table centrale
-- ------------------------------------------------------------
CREATE TABLE public.konbits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'aide', 'projet', 'idee', 'evenement',
    'action_locale', 'collecte', 'mission', 'discussion'
  )),
  location TEXT,
  event_date TIMESTAMPTZ,
  participants_target INTEGER CHECK (participants_target IS NULL OR participants_target > 0),
  media JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'nouvelle' CHECK (status IN ('nouvelle', 'en_cours', 'terminee')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_konbits_user_id ON public.konbits(user_id);
CREATE INDEX idx_konbits_created_at ON public.konbits(created_at DESC);
CREATE INDEX idx_konbits_status ON public.konbits(status);
CREATE INDEX idx_konbits_category ON public.konbits(category);

ALTER TABLE public.konbits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Konbits are viewable by everyone" ON public.konbits
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create konbits" ON public.konbits
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);
CREATE POLICY "Creators can update own konbits" ON public.konbits
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Creators can delete own konbits" ON public.konbits
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2. KONBIT PARTICIPANTS — rejoindre / proposer son aide
-- ------------------------------------------------------------
CREATE TABLE public.konbit_participants (
  id BIGSERIAL PRIMARY KEY,
  konbit_id BIGINT NOT NULL REFERENCES public.konbits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'participant' CHECK (type IN ('participant', 'helper')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(konbit_id, user_id)
);

CREATE INDEX idx_konbit_participants_konbit_id ON public.konbit_participants(konbit_id);
CREATE INDEX idx_konbit_participants_user_id ON public.konbit_participants(user_id);

ALTER TABLE public.konbit_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants are viewable by everyone" ON public.konbit_participants
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join" ON public.konbit_participants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);
CREATE POLICY "Users can update own participation" ON public.konbit_participants
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can leave a konbit" ON public.konbit_participants
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. KONBIT COMMENTS
-- ------------------------------------------------------------
CREATE TABLE public.konbit_comments (
  id BIGSERIAL PRIMARY KEY,
  konbit_id BIGINT NOT NULL REFERENCES public.konbits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id BIGINT REFERENCES public.konbit_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_konbit_comments_konbit_id ON public.konbit_comments(konbit_id);
CREATE INDEX idx_konbit_comments_user_id ON public.konbit_comments(user_id);
CREATE INDEX idx_konbit_comments_parent_id ON public.konbit_comments(parent_id);

ALTER TABLE public.konbit_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone" ON public.konbit_comments
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.konbit_comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.konbit_comments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.konbit_comments
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. KONBIT LIKES — signal de soutien léger
-- ------------------------------------------------------------
CREATE TABLE public.konbit_likes (
  id BIGSERIAL PRIMARY KEY,
  konbit_id BIGINT NOT NULL REFERENCES public.konbits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(konbit_id, user_id)
);

CREATE INDEX idx_konbit_likes_konbit_id ON public.konbit_likes(konbit_id);
CREATE INDEX idx_konbit_likes_user_id ON public.konbit_likes(user_id);

ALTER TABLE public.konbit_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone" ON public.konbit_likes
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like/unlike" ON public.konbit_likes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);
CREATE POLICY "Users can remove their like" ON public.konbit_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 5. KONBIT BOOKMARKS — enregistrer
-- ------------------------------------------------------------
CREATE TABLE public.konbit_bookmarks (
  id BIGSERIAL PRIMARY KEY,
  konbit_id BIGINT NOT NULL REFERENCES public.konbits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(konbit_id, user_id)
);

ALTER TABLE public.konbit_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own bookmarks" ON public.konbit_bookmarks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can bookmark" ON public.konbit_bookmarks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);
CREATE POLICY "Users can remove own bookmark" ON public.konbit_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. KONBIT NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE public.konbit_notifications (
  id BIGSERIAL PRIMARY KEY,
  konbit_id BIGINT NOT NULL REFERENCES public.konbits(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('join', 'help_offer', 'comment', 'like', 'status_change')),
  read BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_konbit_notifications_receiver ON public.konbit_notifications(receiver_id);
CREATE INDEX idx_konbit_notifications_read ON public.konbit_notifications(receiver_id, read);

ALTER TABLE public.konbit_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.konbit_notifications
  FOR SELECT USING (auth.uid() = receiver_id);
CREATE POLICY "System can create notifications" ON public.konbit_notifications
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can mark own notifications as read" ON public.konbit_notifications
  FOR UPDATE USING (auth.uid() = receiver_id);

-- ------------------------------------------------------------
-- 7. REPORTED KONBITS — modération
-- ------------------------------------------------------------
CREATE TABLE public.reported_konbits (
  id BIGSERIAL PRIMARY KEY,
  konbit_id BIGINT NOT NULL REFERENCES public.konbits(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reported_konbits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report a konbit" ON public.reported_konbits
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = reporter_id);
CREATE POLICY "Reporters can view own reports" ON public.reported_konbits
  FOR SELECT USING (auth.uid() = reporter_id);

-- ------------------------------------------------------------
-- 8. STORAGE — bucket konbit-media (images + vidéos)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES
  ('konbit-media', 'konbit-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for konbit-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'konbit-media');
CREATE POLICY "Authenticated users can upload to konbit-media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'konbit-media' AND auth.role() = 'authenticated');
