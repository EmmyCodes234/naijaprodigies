-- Fix Messaging User ID Mismatch and RLS Policies

-- 1. Backfill public.users from auth.users if missing
-- This ensures that for every authenticated user, there is a corresponding record in public.users
INSERT INTO public.users (auth_id, handle, name, avatar)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'handle', 'user_' || substr(id::text, 1, 8)),
  COALESCE(raw_user_meta_data->>'name', 'User'),
  COALESCE(raw_user_meta_data->>'avatar', NULL)
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE auth_id = auth.users.id
);

-- 2. Create a stable helper function to check participation for the CURRENT user
-- This function correctly resolves auth.uid() -> public.users.id
CREATE OR REPLACE FUNCTION is_current_user_participant(p_conversation_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_public_user_id UUID;
BEGIN
  -- Look up the public user ID for the current authenticated user
  SELECT id INTO v_public_user_id
  FROM public.users
  WHERE auth_id = auth.uid();
  
  -- If no public profile exists, they can't be a participant
  IF v_public_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM conversation_participants 
    WHERE conversation_id = p_conversation_id 
    AND user_id = v_public_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- 3. Fix the `create_new_conversation` function
-- It must look up the sender's PUBLIC ID using their AUTH ID
CREATE OR REPLACE FUNCTION create_new_conversation(p_other_user_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_conversation_id UUID;
  v_current_user_id UUID;
BEGIN
  -- Get the current user's PUBLIC ID derived from their AUTH ID
  SELECT id INTO v_current_user_id
  FROM users
  WHERE auth_id = auth.uid();

  -- Ensure we found the user
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Create the conversation
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO v_conversation_id;

  -- Add the current user as a participant
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (v_conversation_id, v_current_user_id);

  -- Add the other user as a participant
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (v_conversation_id, p_other_user_id);

  RETURN v_conversation_id;
END;
$$;

-- 4. Fix RLS Policies by using the correct helper function
-- We drop existing policies to ensure a clean slate for messaging security

-- Drop old policies (some might not exist or have different names, handling gracefully)
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;

DROP POLICY IF EXISTS "Users can view participants of own conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to own conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update own participant record" ON conversation_participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON conversation_participants;

DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to own conversations" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

-- --- Conversations Policies ---

CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (is_current_user_participant(id));

CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (true); -- RPC handles the actual logic safely

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (is_current_user_participant(id));

-- --- Conversation Participants Policies ---

CREATE POLICY "Users can view participants of own conversations"
  ON conversation_participants FOR SELECT
  USING (is_current_user_participant(conversation_id));

-- Allow users to add themselves or others if they are already in the conversation
CREATE POLICY "Users can add participants to conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    -- 1. Resolve auth.uid() to public ID to check if user is adding THEMSELVES (e.g. joining?) 
    -- Actually, usually done via RPC. But for safety:
    (
      SELECT id FROM users WHERE auth_id = auth.uid()
    ) = user_id
    OR 
    -- 2. Or they are already a participant adding someone else
    is_current_user_participant(conversation_id)
  );

CREATE POLICY "Users can update own participant record"
  ON conversation_participants FOR UPDATE
  USING (
    (SELECT id FROM users WHERE auth_id = auth.uid()) = user_id
  );

CREATE POLICY "Users can leave conversations"
  ON conversation_participants FOR DELETE
  USING (
    (SELECT id FROM users WHERE auth_id = auth.uid()) = user_id
  );

-- --- Messages Policies ---

CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (is_current_user_participant(conversation_id));

CREATE POLICY "Users can send messages to own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    -- Author must correspond to current user
    sender_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND
    -- Must be a participant
    is_current_user_participant(conversation_id)
  );

-- Only allow editing/deleting own messages
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (sender_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (sender_id = (SELECT id FROM users WHERE auth_id = auth.uid()));
