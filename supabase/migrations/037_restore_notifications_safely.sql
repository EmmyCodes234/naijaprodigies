-- RESTORE NOTIFICATIONS SAFELY
-- This script re-enables notifications but ignores the AI, preventing crashes.

-- 1. Create the FIXED notification function
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prodigy_id UUID := 'd0000000-0000-0000-0000-000000000001';
  v_post_author_id UUID;
BEGIN
  -- SAFETY PROVISION: Skip notifications for AI bot comments
  IF NEW.user_id = v_prodigy_id THEN
    RETURN NEW;
  END IF;

  -- Get post author
  SELECT user_id INTO v_post_author_id FROM posts WHERE id = NEW.post_id;
  
  -- Only create notification if commenter != post author
  IF NEW.user_id != v_post_author_id THEN
    INSERT INTO notifications (user_id, type, actor_id, post_id, comment_id)
    VALUES (
      v_post_author_id,
      'comment',
      NEW.user_id,
      NEW.post_id,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Re-enable the trigger
DROP TRIGGER IF EXISTS trigger_comment_notification ON comments;

CREATE TRIGGER trigger_comment_notification
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();
