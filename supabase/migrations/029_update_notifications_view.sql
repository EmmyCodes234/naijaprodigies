-- Update notifications_with_details view to include verification_type
DROP VIEW IF EXISTS notifications_with_details;

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
  u.verification_type as actor_verification_type,
  p.content as post_content,
  c.content as comment_content
FROM notifications n
LEFT JOIN users u ON n.actor_id = u.id
LEFT JOIN posts p ON n.post_id = p.id
LEFT JOIN comments c ON n.comment_id = c.id;
