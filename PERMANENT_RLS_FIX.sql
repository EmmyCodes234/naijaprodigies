-- PERMANENT FIX FOR MESSAGING RLS POLICIES
-- Apply this in your Supabase SQL Editor

-- Ensure RLS is enabled on all messaging tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;

-- Create proper policies with correct permissions
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can add participants to conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
      )
    )
  );

-- Verify policies were applied
SELECT 
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename IN ('conversations', 'conversation_participants')
ORDER BY tablename, policyname;