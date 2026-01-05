-- Emergency fix: Disable problematic trigger, create AI infrastructure, fix and re-enable
-- Run this entire file as one transaction

BEGIN;

-- Step 1: Temporarily disable the problematic notification trigger
DROP TRIGGER IF EXISTS trigger_comment_notification ON comments;

-- Step 2: Create Prodigy AI user (if not exists)
INSERT INTO public.users (id, handle, name, avatar, bio, rank, verified, verification_type)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'Prodigy',
  'Prodigy AI',
  'https://api.iconify.design/ph:sparkle-fill.svg?color=%2300ba7c',
  'The official AI assistant of NSP. Powered by Llama 3.3 70b.',
  'AI',
  true,
  'gold'
) ON CONFLICT (id) DO UPDATE SET 
    name = 'Prodigy AI',
    verified = true,
    verification_type = 'gold',
    avatar = 'https://api.iconify.design/ph:sparkle-fill.svg?color=%2300ba7c';

-- Step 3: Create AI reply function
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
  INSERT INTO comments (post_id, user_id, content, parent_comment_id)
  VALUES (p_post_id, v_prodigy_id, p_content, p_parent_comment_id)
  RETURNING id INTO v_comment_id;
  RETURN v_comment_id;
END;
$$;

-- Step 4: Fix the notification trigger to prevent AI bot loops
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prodigy_id UUID := 'd0000000-0000-0000-0000-000000000001';
  v_post_author_id UUID;
BEGIN
  -- Skip notifications for AI bot comments
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

-- Step 5: Re-enable the trigger with the fixed function
CREATE TRIGGER trigger_comment_notification
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

COMMIT;
