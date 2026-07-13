-- ⚠️ Supprimer TOUTES les policies problématiques
DROP POLICY IF EXISTS "Users view own conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can manage conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;

-- ============================================
-- CONVERSATIONS : tout le monde peut lire/écrire
-- ============================================
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversations" ON public.conversations;

CREATE POLICY "Authenticated users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Participants can view conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );

-- ============================================
-- CONVERSATION PARTICIPANTS
-- ============================================
CREATE POLICY "Anyone can insert participants" ON public.conversation_participants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users view own participants" ON public.conversation_participants
  FOR SELECT USING (user_id = auth.uid());

-- ============================================
-- MESSAGES
-- ============================================
CREATE POLICY "Participants can view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );