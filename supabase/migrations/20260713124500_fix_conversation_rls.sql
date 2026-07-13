-- Fix RLS policy to allow creating conversations with other participants
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users view own conversations" ON public.conversation_participants;

CREATE POLICY "Authenticated users can manage conversations" ON public.conversation_participants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users view own conversations" ON public.conversation_participants
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );