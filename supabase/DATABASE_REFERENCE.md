# Database Reference Guide

Quick reference for working with the NSP Social Feed database schema.

## Table Relationships

```
users
  ├── posts (user_id)
  │   ├── post_images (post_id)
  │   ├── likes (post_id, user_id)
  │   ├── comments (post_id, user_id)
  │   └── posts (original_post_id) [re-racks]
  ├── follows (follower_id, following_id)
  ├── notifications (user_id, actor_id)
  ├── conversation_participants (user_id)
  │   └── conversations (conversation_id)
  │       └── messages (conversation_id, sender_id)
  └── messages (sender_id)
```

## Table Schemas

### users
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated user ID |
| handle | TEXT | UNIQUE, NOT NULL | Username (e.g., @johndoe) |
| name | TEXT | NOT NULL | Display name |
| avatar | TEXT | NULL | Avatar image URL |
| bio | TEXT | NULL | User biography |
| rank | TEXT | NULL | Scrabble rank (e.g., Grandmaster) |
| verified | BOOLEAN | DEFAULT false | Verification badge status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

### posts
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated post ID |
| user_id | UUID | FOREIGN KEY → users(id) | Post author |
| content | TEXT | NOT NULL, ≤280 chars | Post text content |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Post creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |
| is_rerack | BOOLEAN | DEFAULT false | Is this a re-rack? |
| original_post_id | UUID | FOREIGN KEY → posts(id) | Original post (for re-racks) |
| quote_text | TEXT | NULL | Commentary for quote re-racks |

### post_images
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated image ID |
| post_id | UUID | FOREIGN KEY → posts(id) | Associated post |
| image_url | TEXT | NOT NULL | Supabase Storage URL |
| position | INTEGER | 1-4 | Image order in post |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Upload timestamp |

### likes
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated like ID |
| post_id | UUID | FOREIGN KEY → posts(id) | Liked post |
| user_id | UUID | FOREIGN KEY → users(id) | User who liked |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Like timestamp |
| | | UNIQUE(post_id, user_id) | One like per user per post |

### comments
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated comment ID |
| post_id | UUID | FOREIGN KEY → posts(id) | Commented post |
| user_id | UUID | FOREIGN KEY → users(id) | Comment author |
| content | TEXT | NOT NULL | Comment text |
| parent_comment_id | UUID | FOREIGN KEY → comments(id) | Parent comment (for threading) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Comment timestamp |

### follows
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated follow ID |
| follower_id | UUID | FOREIGN KEY → users(id) | User who follows |
| following_id | UUID | FOREIGN KEY → users(id) | User being followed |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Follow timestamp |
| | | UNIQUE(follower_id, following_id) | One follow per pair |
| | | CHECK(follower_id ≠ following_id) | Cannot follow self |

### conversations
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated conversation ID |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Conversation creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last message timestamp |

### conversation_participants
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated participant ID |
| conversation_id | UUID | FOREIGN KEY → conversations(id) | Associated conversation |
| user_id | UUID | FOREIGN KEY → users(id) | Participant user |
| joined_at | TIMESTAMPTZ | DEFAULT NOW() | When user joined conversation |
| last_read_at | TIMESTAMPTZ | DEFAULT NOW() | Last time user read messages |
| | | UNIQUE(conversation_id, user_id) | One participant record per user per conversation |

### messages
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated message ID |
| conversation_id | UUID | FOREIGN KEY → conversations(id) | Associated conversation |
| sender_id | UUID | FOREIGN KEY → users(id) | Message sender |
| content | TEXT | NOT NULL, ≤1000 chars | Message text content |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Message sent timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last edit timestamp |

### notifications
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated notification ID |
| user_id | UUID | FOREIGN KEY → users(id) | User receiving notification |
| type | TEXT | NOT NULL, CHECK(type IN (...)) | Notification type (like, comment, follow, rerack, mention) |
| actor_id | UUID | FOREIGN KEY → users(id) | User who performed the action |
| post_id | UUID | FOREIGN KEY → posts(id) | Related post (if applicable) |
| comment_id | UUID | FOREIGN KEY → comments(id) | Related comment (if applicable) |
| is_read | BOOLEAN | DEFAULT false | Whether notification has been read |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Notification creation timestamp |

## Views

### posts_with_counts
Aggregated view showing posts with engagement metrics.

| Column | Type | Description |
|--------|------|-------------|
| * | | All columns from posts table |
| likes_count | BIGINT | Number of likes |
| comments_count | BIGINT | Number of comments |
| reracks_count | BIGINT | Number of re-racks |

**Usage**:
```sql
SELECT * FROM posts_with_counts 
WHERE user_id = 'some-uuid'
ORDER BY created_at DESC;
```

### conversations_with_last_message
Conversations with most recent message information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Conversation ID |
| created_at | TIMESTAMPTZ | Conversation creation timestamp |
| updated_at | TIMESTAMPTZ | Last message timestamp |
| last_message_content | TEXT | Content of most recent message |
| last_message_sender_id | UUID | Sender of most recent message |
| last_message_at | TIMESTAMPTZ | Timestamp of most recent message |

**Usage**:
```sql
SELECT * FROM conversations_with_last_message
WHERE id IN (
  SELECT conversation_id FROM conversation_participants
  WHERE user_id = 'user-uuid'
)
ORDER BY updated_at DESC;
```

### unread_message_counts
Unread message counts per conversation per user.

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | User ID |
| conversation_id | UUID | Conversation ID |
| unread_count | BIGINT | Number of unread messages |

**Usage**:
```sql
SELECT * FROM unread_message_counts
WHERE user_id = 'user-uuid';
```

### notifications_with_details
Notifications with actor and post details.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Notification ID |
| user_id | UUID | User receiving notification |
| type | TEXT | Notification type |
| actor_id | UUID | User who performed action |
| post_id | UUID | Related post ID |
| comment_id | UUID | Related comment ID |
| is_read | BOOLEAN | Read status |
| created_at | TIMESTAMPTZ | Creation timestamp |
| actor_handle | TEXT | Actor's username |
| actor_name | TEXT | Actor's display name |
| actor_avatar | TEXT | Actor's avatar URL |
| actor_verified | BOOLEAN | Actor's verification status |
| post_content | TEXT | Related post content |
| comment_content | TEXT | Related comment content |

**Usage**:
```sql
SELECT * FROM notifications_with_details
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 50;
```

## Indexes

Performance indexes created on:
- `posts.user_id` - Fast user post lookups
- `posts.created_at DESC` - Fast chronological ordering
- `post_images.post_id` - Fast image lookups
- `likes.post_id` - Fast like count queries
- `likes.user_id` - Fast user like history
- `comments.post_id` - Fast comment retrieval
- `comments.user_id` - Fast user comment history
- `follows.follower_id` - Fast follower lookups
- `follows.following_id` - Fast following lookups
- `conversation_participants.conversation_id` - Fast participant lookups
- `conversation_participants.user_id` - Fast user conversation lookups
- `messages.conversation_id` - Fast message retrieval
- `messages.sender_id` - Fast sender message history
- `messages.created_at DESC` - Fast chronological message ordering
- `conversations.updated_at DESC` - Fast conversation ordering by activity
- `notifications.user_id, is_read, created_at DESC` - Fast unread notification queries
- `notifications.user_id, created_at DESC` - Fast notification retrieval
- `notifications.actor_id` - Fast actor notification lookups
- `notifications.post_id` - Fast post notification lookups

## Cascade Behaviors

### ON DELETE CASCADE
When a parent record is deleted, child records are automatically deleted:

- Delete user → deletes all their posts, likes, comments, follows, conversation_participants, messages
- Delete post → deletes all post_images, likes, comments, notifications for that post
- Delete comment → deletes all replies to that comment, notifications for that comment
- Delete conversation → deletes all conversation_participants and messages for that conversation
- Delete user → deletes all notifications where they are the recipient or actor

### ON DELETE SET NULL
- Delete post → sets `original_post_id` to NULL in re-racks (preserves re-rack)

## Row Level Security (RLS) Policies

### Read Policies (SELECT)
- ✓ All tables: Everyone can read

### Write Policies (INSERT/UPDATE/DELETE)

**users**:
- UPDATE: Users can update their own profile only

**posts**:
- INSERT: Authenticated users can create posts
- UPDATE: Users can update their own posts only
- DELETE: Users can delete their own posts only

**post_images**:
- INSERT: Users can add images to their own posts
- DELETE: Users can delete images from their own posts

**likes**:
- INSERT: Authenticated users can like posts
- DELETE: Users can delete their own likes

**comments**:
- INSERT: Authenticated users can create comments
- DELETE: Users can delete their own comments

**follows**:
- INSERT: Authenticated users can follow others
- DELETE: Users can unfollow (delete their own follow records)

**conversations**:
- SELECT: Users can view conversations they participate in
- INSERT: Authenticated users can create conversations
- UPDATE: Users can update conversations they participate in

**conversation_participants**:
- SELECT: Users can view participants of conversations they're in
- INSERT: Users can add themselves or others to conversations they're in
- UPDATE: Users can update their own participant record (e.g., last_read_at)
- DELETE: Users can leave conversations (delete their own participant record)

**messages**:
- SELECT: Users can view messages in conversations they participate in
- INSERT: Users can send messages to conversations they're in
- UPDATE: Users can update their own messages
- DELETE: Users can delete their own messages

**notifications**:
- SELECT: Users can view their own notifications only
- UPDATE: Users can update their own notifications (e.g., mark as read)
- DELETE: Users can delete their own notifications
- INSERT: System can insert notifications (via triggers with SECURITY DEFINER)

## Common Queries

### Get user's posts with engagement counts
```sql
SELECT * FROM posts_with_counts
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 20;
```

### Get post with images
```sql
SELECT 
  p.*,
  array_agg(pi.image_url ORDER BY pi.position) as images
FROM posts p
LEFT JOIN post_images pi ON p.id = pi.post_id
WHERE p.id = 'post-uuid'
GROUP BY p.id;
```

### Get user's followers
```sql
SELECT u.* FROM users u
JOIN follows f ON u.id = f.follower_id
WHERE f.following_id = 'user-uuid';
```

### Get user's following
```sql
SELECT u.* FROM users u
JOIN follows f ON u.id = f.following_id
WHERE f.follower_id = 'user-uuid';
```

### Check if user A follows user B
```sql
SELECT EXISTS(
  SELECT 1 FROM follows
  WHERE follower_id = 'user-a-uuid'
  AND following_id = 'user-b-uuid'
);
```

### Get threaded comments
```sql
WITH RECURSIVE comment_tree AS (
  -- Root comments
  SELECT *, 0 as depth
  FROM comments
  WHERE post_id = 'post-uuid' AND parent_comment_id IS NULL
  
  UNION ALL
  
  -- Replies
  SELECT c.*, ct.depth + 1
  FROM comments c
  JOIN comment_tree ct ON c.parent_comment_id = ct.id
)
SELECT * FROM comment_tree
ORDER BY created_at ASC;
```

### Get user's conversations with unread counts
```sql
SELECT 
  c.*,
  cwlm.last_message_content,
  cwlm.last_message_sender_id,
  cwlm.last_message_at,
  COALESCE(umc.unread_count, 0) as unread_count
FROM conversations c
JOIN conversation_participants cp ON cp.conversation_id = c.id
LEFT JOIN conversations_with_last_message cwlm ON cwlm.id = c.id
LEFT JOIN unread_message_counts umc ON umc.conversation_id = c.id 
  AND umc.user_id = 'user-uuid'
WHERE cp.user_id = 'user-uuid'
ORDER BY c.updated_at DESC;
```

### Get messages in a conversation
```sql
SELECT 
  m.*,
  u.handle,
  u.name,
  u.avatar
FROM messages m
JOIN users u ON m.sender_id = u.id
WHERE m.conversation_id = 'conversation-uuid'
ORDER BY m.created_at ASC;
```

### Create a conversation between two users
```sql
-- 1. Create conversation
INSERT INTO conversations DEFAULT VALUES
RETURNING id;

-- 2. Add participants
INSERT INTO conversation_participants (conversation_id, user_id)
VALUES 
  ('conversation-uuid', 'user1-uuid'),
  ('conversation-uuid', 'user2-uuid');
```

### Send a message
```sql
INSERT INTO messages (conversation_id, sender_id, content)
VALUES ('conversation-uuid', 'sender-uuid', 'Hello!')
RETURNING *;
-- Note: This automatically updates conversations.updated_at via trigger
```

### Mark conversation as read
```sql
UPDATE conversation_participants
SET last_read_at = NOW()
WHERE conversation_id = 'conversation-uuid'
  AND user_id = 'user-uuid';
```

### Get user's notifications
```sql
SELECT * FROM notifications_with_details
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 50;
```

### Get unread notifications
```sql
SELECT * FROM notifications_with_details
WHERE user_id = 'user-uuid' AND is_read = false
ORDER BY created_at DESC;
```

### Mark notification as read
```sql
UPDATE notifications
SET is_read = true
WHERE id = 'notification-uuid' AND user_id = 'user-uuid';
```

### Mark all notifications as read
```sql
UPDATE notifications
SET is_read = true
WHERE user_id = 'user-uuid' AND is_read = false;
```

### Get unread notification count
```sql
SELECT get_unread_notification_count('user-uuid');
```

## TypeScript Types

See `types.ts` for TypeScript interfaces matching this schema:
- `User`
- `Post`
- `Comment`
- `Like`
- `Follow`
- `Conversation`
- `ConversationParticipant`
- `Message`
- `Notification`
