-- SAFE NOTIFICATION RESTORATION (Internal Only)
-- This script re-enables in-app notifications but DISABLES the risky push-notification webhook
-- to prevent database crashes.

BEGIN;

-- 1. Restore the 'Internal' Notification Trigger (Safe DB Insert)
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prodigy_id UUID := 'd0000000-0000-0000-0000-000000000001';
  v_post_author_id UUID;
BEGIN
  -- SAFETY: Ignore AI comments
  IF NEW.user_id = v_prodigy_id THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_post_author_id FROM posts WHERE id = NEW.post_id;
  
  -- Notify if not self-reply
  IF NEW.user_id != v_post_author_id THEN
    INSERT INTO notifications (user_id, type, actor_id, post_id, comment_id)
    VALUES (v_post_author_id, 'comment', NEW.user_id, NEW.post_id, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Bind the Internal Trigger
DROP TRIGGER IF EXISTS trigger_comment_notification ON comments;
CREATE TRIGGER trigger_comment_notification
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();


-- 3. DISABLE the external 'Push' Trigger (The Crash Culprit)
-- We remove the trigger that calls pg_net/Edge Functions.
-- This sacrifices Mobile Push Notifications for stability.
DROP TRIGGER IF EXISTS on_notification_created ON notifications;

COMMIT;
