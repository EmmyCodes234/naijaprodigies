-- Fix notification triggers to prevent issues with AI bot comments
-- The create_comment_notification trigger was causing memory issues when AI bot posts

CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prodigy_id UUID := 'd0000000-0000-0000-0000-000000000001';
BEGIN
  -- Skip notifications for AI bot comments to avoid trigger complexity
  IF NEW.user_id = v_prodigy_id THEN
    RETURN NEW;
  END IF;

  -- Only create notification if the commenter is not the post author
  IF NEW.user_id != (SELECT user_id FROM posts WHERE id = NEW.post_id) THEN
    INSERT INTO notifications (user_id, type, actor_id, post_id, comment_id)
    VALUES (
      (SELECT user_id FROM posts WHERE id = NEW.post_id),
      'comment',
      NEW.user_id,
      NEW.post_id,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
