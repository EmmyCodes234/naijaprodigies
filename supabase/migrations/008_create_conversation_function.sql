-- Create a function to handle conversation creation atomically
-- This avoids RLS issues where the user can't select the conversation before being added as a participant
CREATE OR REPLACE FUNCTION create_new_conversation(p_other_user_id UUID)
RETURNS UUID
SECURITY DEFINER -- Bypass RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_conversation_id UUID;
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  -- Validation
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_other_user_id IS NULL THEN
    RAISE EXCEPTION 'Recipient ID is required';
  END IF;

  IF v_current_user_id = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;

  -- Create conversation
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO v_conversation_id;

  -- Add participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (v_conversation_id, v_current_user_id),
    (v_conversation_id, p_other_user_id);

  RETURN v_conversation_id;
END;
$$;
