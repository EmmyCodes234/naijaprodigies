-- ALLOW AI NOTIFICATIONS (Internal Only)
-- Now that the crashing "Push" trigger is gone, we can safely let Prodigy notify users.

CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id UUID;
BEGIN
  -- We removed the block that ignored 'Prodigy', so now AI replies generate notifications!

  -- Get post author
  SELECT user_id INTO v_post_author_id FROM posts WHERE id = NEW.post_id;
  
  -- Only create notification if commenter != post author
  IF NEW.user_id != v_post_author_id THEN
    INSERT INTO notifications (user_id, type, actor_id, post_id, comment_id)
    VALUES (
      v_post_author_id,
      'comment',
      NEW.user_id, -- This will be Prodigy's ID
      NEW.post_id,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
