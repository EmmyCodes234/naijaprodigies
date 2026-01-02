# Notifications Database Schema

This document describes the notifications database schema and automatic notification triggers.

## Overview

The notifications system provides real-time updates to users when other users interact with their content or profile. Notifications are automatically created via database triggers for the following events:

- **Like**: When someone likes a user's post
- **Comment**: When someone comments on a user's post
- **Follow**: When someone follows a user
- **Re-Rack**: When someone re-racks a user's post
- **Mention**: When someone mentions a user in a post (requires application-level parsing)

## Database Schema

### notifications table

```sql
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
```

### Fields

- **id**: Unique identifier for the notification
- **user_id**: The user who receives the notification
- **type**: Type of notification (like, comment, follow, rerack, mention)
- **actor_id**: The user who performed the action
- **post_id**: Reference to the post (if applicable)
- **comment_id**: Reference to the comment (if applicable)
- **is_read**: Whether the notification has been read
- **created_at**: When the notification was created

### Indexes

```sql
-- Optimized for querying unread notifications by user
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_actor ON notifications(actor_id);
CREATE INDEX idx_notifications_post ON notifications(post_id);
```

## Automatic Notification Triggers

### Like Notifications

**Trigger**: `trigger_like_notification`
**Event**: After INSERT on `likes` table
**Logic**: Creates a notification for the post author when someone likes their post (unless the liker is the author)

```sql
CREATE TRIGGER trigger_like_notification
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION create_like_notification();
```

### Comment Notifications

**Trigger**: `trigger_comment_notification`
**Event**: After INSERT on `comments` table
**Logic**: Creates a notification for the post author when someone comments on their post (unless the commenter is the author)

```sql
CREATE TRIGGER trigger_comment_notification
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();
```

### Follow Notifications

**Trigger**: `trigger_follow_notification`
**Event**: After INSERT on `follows` table
**Logic**: Creates a notification for the followed user when someone follows them

```sql
CREATE TRIGGER trigger_follow_notification
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_notification();
```

### Re-Rack Notifications

**Trigger**: `trigger_rerack_notification`
**Event**: After INSERT on `posts` table
**Logic**: Creates a notification for the original post author when someone re-racks their post (unless the re-racker is the author)

```sql
CREATE TRIGGER trigger_rerack_notification
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION create_rerack_notification();
```

### Mention Notifications

**Function**: `create_mention_notification(p_mentioned_user_id, p_post_id, p_actor_id)`
**Event**: Called from application code after parsing post content
**Logic**: Creates a notification for the mentioned user (unless the mentioner is the mentioned user)

This is not a trigger but a function that must be called from the application layer after parsing @mentions from post content.

```typescript
// Example usage in postService.ts
const mentions = extractMentions(content);
for (const mention of mentions) {
  const mentionedUser = await getUserByHandle(mention);
  if (mentionedUser) {
    await supabase.rpc('create_mention_notification', {
      p_mentioned_user_id: mentionedUser.id,
      p_post_id: newPost.id,
      p_actor_id: userId
    });
  }
}
```

## Row Level Security (RLS) Policies

### SELECT Policy
Users can only view their own notifications:
```sql
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);
```

### UPDATE Policy
Users can update their own notifications (e.g., mark as read):
```sql
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
```

### DELETE Policy
Users can delete their own notifications:
```sql
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);
```

### INSERT Policy
System can insert notifications (triggers use SECURITY DEFINER):
```sql
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);
```

## Views

### notifications_with_details

Provides a denormalized view of notifications with actor and post details:

```sql
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
```

## Helper Functions

### get_unread_notification_count

Returns the count of unread notifications for a user:

```sql
SELECT get_unread_notification_count('user-uuid-here');
```

## Usage Examples

### Query User's Notifications

```sql
-- Get all notifications for a user (RLS enforced)
SELECT * FROM notifications_with_details
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 50;

-- Get unread notifications only
SELECT * FROM notifications_with_details
WHERE user_id = auth.uid() AND is_read = false
ORDER BY created_at DESC;
```

### Mark Notification as Read

```sql
UPDATE notifications
SET is_read = true
WHERE id = 'notification-uuid-here' AND user_id = auth.uid();
```

### Mark All Notifications as Read

```sql
UPDATE notifications
SET is_read = true
WHERE user_id = auth.uid() AND is_read = false;
```

### Get Unread Count

```sql
SELECT get_unread_notification_count(auth.uid());
```

## Real-Time Subscriptions

To receive real-time notification updates in the application:

```typescript
// Subscribe to new notifications
const subscription = supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('New notification:', payload.new);
      // Update UI with new notification
    }
  )
  .subscribe();
```

## Migration File

The notifications schema is defined in:
- `supabase/migrations/006_notifications.sql`

To apply this migration to your Supabase project, run:
```bash
supabase db push
```

Or apply it manually through the Supabase SQL Editor.

## Requirements Validation

This schema satisfies the following requirements:

- **11.1**: Notifications created for likes (via trigger)
- **11.2**: Notifications created for comments (via trigger)
- **11.3**: Notifications created for follows (via trigger)
- **11.4**: Notifications displayed in reverse chronological order (via ORDER BY created_at DESC)
- **11.5**: Notifications can be marked as read (via UPDATE policy and is_read field)

