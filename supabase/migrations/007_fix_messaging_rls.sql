-- Fix infinite recursion in conversation_participants RLS policies
-- This migration fixes the circular dependency in the SELECT and INSERT policies

-- Drop ALL existing policies that we're going to recreate
DROP POLICY IF EXISTS "Users can view participants of own conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to own conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;

-- Create simpler, non-recursive policies using a helper function

-- Create a helper function to check if a user is a participant in a conversation
-- This function uses SECURITY DEFINER to bypass RLS and prevent recursion
CREATE OR REPLACE FUNCTION is_conversation_participant(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM conversation_participants 
    WHERE conversation_id = p_conversation_id 
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- Users can view all participant records for conversations they're in
CREATE POLICY "Users can view participants of own conversations"
  ON conversation_participants FOR SELECT
  USING (
    is_conversation_participant(conversation_id, auth.uid())
  );

-- Users can add participants (themselves or others) to conversations they're in
CREATE POLICY "Users can add participants to conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- Allow adding self to new conversations
      user_id = auth.uid()
      OR
      -- Or adding others if already a participant
      is_conversation_participant(conversation_id, auth.uid())
    )
  );


-- Fix conversations INSERT policy
-- Allow any authenticated user to create a conversation
-- This is safe because users can only see conversations they participate in
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);
