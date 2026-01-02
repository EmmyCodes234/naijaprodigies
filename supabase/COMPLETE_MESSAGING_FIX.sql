-- COMPLETE MESSAGING RLS FIX
-- This script will completely reset and fix all messaging RLS policies
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Show current state (for debugging)
-- ============================================
SELECT 'Current RLS policies:' as step;
SELECT tablename, policyname, cmd, roles
FROM pg_policies 
WHERE tablename IN ('conversations', 'conversation_participants', 'messages')
ORDER BY tablename, policyname;

-- ============================================
-- STEP 2: Drop ALL existing policies
-- ============================================
SELECT 'Dropping all existing policies...' as step;

-- Drop all conversation policies
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;

-- Drop all conversation_participants policies  
DROP POLICY IF EXISTS "Users can view participants of own conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to own conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update own participant record" ON conversation_participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON conversation_participants;

-- Drop all messages policies
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to own conversations" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

-- ============================================
-- STEP 3: Create helper function
-- ============================================
SELECT 'Creating helper function...' as step;

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

-- ============================================
-- STEP 4: Create NEW policies for conversations
-- ============================================
SELECT 'Creating conversations policies...' as step;

-- SELECT: Users can only see conversations they participate in
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (
    is_conversation_participant(id, auth.uid())
  );

-- INSERT: Any authenticated user can create a conversation
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Users can update conversations they participate in
CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (
    is_conversation_participant(id, auth.uid())
  );

-- ============================================
-- STEP 5: Create NEW policies for conversation_participants
-- ============================================
SELECT 'Creating conversation_participants policies...' as step;

-- SELECT: Users can view participants of conversations they're in
CREATE POLICY "Users can view participants of own conversations"
  ON conversation_participants FOR SELECT
  USING (
    is_conversation_participant(conversation_id, auth.uid())
  );

-- INSERT: Users can add themselves or others to conversations they're in
CREATE POLICY "Users can add participants to conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid()
      OR
      is_conversation_participant(conversation_id, auth.uid())
    )
  );

-- UPDATE: Users can update their own participant record
CREATE POLICY "Users can update own participant record"
  ON conversation_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE: Users can leave conversations
CREATE POLICY "Users can leave conversations"
  ON conversation_participants FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 6: Create NEW policies for messages
-- ============================================
SELECT 'Creating messages policies...' as step;

-- SELECT: Users can view messages in conversations they participate in
CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (
    is_conversation_participant(conversation_id, auth.uid())
  );

-- INSERT: Users can send messages to conversations they're in
CREATE POLICY "Users can send messages to own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    is_conversation_participant(conversation_id, auth.uid())
  );

-- UPDATE: Users can update their own messages
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- DELETE: Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (auth.uid() = sender_id);

-- ============================================
-- STEP 7: Verify RLS is enabled
-- ============================================
SELECT 'Verifying RLS is enabled...' as step;

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('conversations', 'conversation_participants', 'messages')
ORDER BY tablename;

-- ============================================
-- STEP 8: Show final policies
-- ============================================
SELECT 'Final RLS policies:' as step;

SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN roles = '{public}' THEN 'public'
    ELSE array_to_string(roles, ', ')
  END as roles
FROM pg_policies 
WHERE tablename IN ('conversations', 'conversation_participants', 'messages')
ORDER BY tablename, cmd, policyname;

SELECT 'DONE! Policies have been reset and recreated.' as status;
