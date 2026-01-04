-- Add media support to direct messages
ALTER TABLE public.messages
ADD COLUMN media_url TEXT,
ADD COLUMN media_type TEXT CHECK (media_type IN ('image', 'video', 'gif'));

-- Update views to include media info
DROP VIEW IF EXISTS conversations_with_last_message;
CREATE VIEW conversations_with_last_message AS
SELECT 
  c.id,
  c.created_at,
  c.updated_at,
  m.content as last_message_content,
  m.sender_id as last_message_sender_id,
  m.created_at as last_message_at,
  m.media_url as last_message_media_url,
  m.media_type as last_message_media_type
FROM conversations c
LEFT JOIN LATERAL (
  SELECT content, sender_id, created_at, media_url, media_type
  FROM messages
  WHERE conversation_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) m ON true;
