-- Function to allow creating comments as Prodigy AI
-- SECURITY DEFINER allows it to bypass RLS and insert as the bot user
CREATE OR REPLACE FUNCTION create_ai_reply(
  p_post_id UUID,
  p_content TEXT,
  p_parent_comment_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_comment_id UUID;
  v_prodigy_id UUID := 'd0000000-0000-0000-0000-000000000001';
BEGIN
  -- Verify Prodigy exists (optional, but good for sanity)
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_prodigy_id) THEN
    RAISE EXCEPTION 'Prodigy AI user does not exist';
  END IF;

  INSERT INTO comments (post_id, user_id, content, parent_comment_id)
  VALUES (p_post_id, v_prodigy_id, p_content, p_parent_comment_id)
  RETURNING id INTO v_comment_id;

  -- Create Notification for the post author (optional, maybe overkill for now, triggers generally handle it)
  -- The existing triggers for notifications should handle this naturally since it's a new comment.

  RETURN v_comment_id;
END;
$$;
