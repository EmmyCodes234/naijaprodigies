-- MANUAL RLS FIX FOR MESSAGING
-- Run this directly in Supabase SQL Editor if migrations aren't working
-- This will fix the RLS policies immediately

-- Step 1: Drop ALL existing problematic policies
DROP POLICY IF EXISTS "Users can view participants of own conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to own conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;

-- Step 2: Create helper function
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

-- Step 3: Create fixed policies for conversation_participants
CREATE POLICY "Users can view participants of own conversations"
  ON conversation_participants FOR SELECT
  USING (
    is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY "Users can add participants to conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid()
      OR
      is_conversation_participant(conversation_id, auth.uid())
    )
  );

-- Step 4: Create fixed policy for conversations
-- Use a simple auth check instead of TO authenticated
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Step 5: Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('conversations', 'conversation_participants')
ORDER BY tablename, policyname;
