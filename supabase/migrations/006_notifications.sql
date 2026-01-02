-- Notifications Schema Migration
-- This migration creates the database schema for notifications functionality
-- Requirements: 11.1, 11.2, 11.3, 11.4, 11.5

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'rerack', 'mention')),
  actor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
-- Optimized for querying unread notifications by user
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_actor ON notifications(actor_id);
CREATE INDEX idx_notifications_post ON notifications(post_id);

-- Enable Row Level Security on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications table
-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (e.g., mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- System can insert notifications (triggers will use SECURITY DEFINER functions)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Create function to create notification for likes
-- Uses SECURITY DEFINER to bypass RLS when creating notifications
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create notification if the liker is not the post author
  IF NEW.user_id != (SELECT user_id FROM posts WHERE id = NEW.post_id) THEN
    INSERT INTO notifications (user_id, type, actor_id, post_id)
    VALUES (
      (SELECT user_id FROM posts WHERE id = NEW.post_id),
      'like',
      NEW.user_id,
      NEW.post_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for like notifications
CREATE TRIGGER trigger_like_notification
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION create_like_notification();

-- Create function to create notification for comments
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Create trigger for comment notifications
CREATE TRIGGER trigger_comment_notification
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

-- Create function to create notification for follows
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, actor_id)
  VALUES (
    NEW.following_id,
    'follow',
    NEW.follower_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for follow notifications
CREATE TRIGGER trigger_follow_notification
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_notification();

-- Create function to create notification for re-racks
CREATE OR REPLACE FUNCTION create_rerack_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create notification for re-racks (not original posts)
  IF NEW.is_rerack = true AND NEW.original_post_id IS NOT NULL THEN
    -- Only notify if the re-racker is not the original post author
    IF NEW.user_id != (SELECT user_id FROM posts WHERE id = NEW.original_post_id) THEN
      INSERT INTO notifications (user_id, type, actor_id, post_id)
      VALUES (
        (SELECT user_id FROM posts WHERE id = NEW.original_post_id),
        'rerack',
        NEW.user_id,
        NEW.original_post_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for re-rack notifications
CREATE TRIGGER trigger_rerack_notification
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION create_rerack_notification();

-- Create function to create notification for mentions
-- This will be called from application code when parsing post content
CREATE OR REPLACE FUNCTION create_mention_notification(
  p_mentioned_user_id UUID,
  p_post_id UUID,
  p_actor_id UUID
)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create notification if the mentioner is not the mentioned user
  IF p_actor_id != p_mentioned_user_id THEN
    INSERT INTO notifications (user_id, type, actor_id, post_id)
    VALUES (p_mentioned_user_id, 'mention', p_actor_id, p_post_id)
    ON CONFLICT DO NOTHING; -- Prevent duplicate mention notifications
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create view for notifications with actor and post details
CREATE VIEW notifications_with_details AS
SELECT 
  n.id,
  n.user_id,
  n.type,
  n.actor_id,
  n.post_id,
  n.comment_id,
  n.is_read,
  n.created_at,
  u.handle as actor_handle,
  u.name as actor_name,
  u.avatar as actor_avatar,
  u.verified as actor_verified,
  p.content as post_content,
  c.content as comment_content
FROM notifications n
LEFT JOIN users u ON n.actor_id = u.id
LEFT JOIN posts p ON n.post_id = p.id
LEFT JOIN comments c ON n.comment_id = c.id;

-- Create function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id AND is_read = false
  );
END;
$$ LANGUAGE plpgsql;

