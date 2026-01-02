# Direct Messaging Database Schema

## Overview

This document describes the database schema for the direct messaging feature in the NSP Social Feed application.

## Tables

### conversations

Represents a conversation between two or more users.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| created_at | TIMESTAMPTZ | When the conversation was created |
| updated_at | TIMESTAMPTZ | Last activity timestamp (updated on new messages) |

**Indexes:**
- `idx_conversations_updated_at` - For ordering conversations by most recent activity

### conversation_participants

Links users to conversations (many-to-many relationship).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | Foreign key to conversations |
| user_id | UUID | Foreign key to users |
| joined_at | TIMESTAMPTZ | When the user joined the conversation |
| last_read_at | TIMESTAMPTZ | Last time user read messages (for unread indicator) |

**Constraints:**
- UNIQUE(conversation_id, user_id) - A user can only be in a conversation once
- ON DELETE CASCADE - Remove participant records when conversation or user is deleted

**Indexes:**
- `idx_conversation_participants_conversation_id` - For finding participants of a conversation
- `idx_conversation_participants_user_id` - For finding conversations a user is in

### messages

Stores individual messages within conversations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | Foreign key to conversations |
| sender_id | UUID | Foreign key to users |
| content | TEXT | Message content (max 1000 characters) |
| created_at | TIMESTAMPTZ | When the message was sent |
| updated_at | TIMESTAMPTZ | When the message was last edited |

**Constraints:**
- CHECK (char_length(content) <= 1000) - Enforce 1000 character limit (Requirement 10.5)
- ON DELETE CASCADE - Remove messages when conversation or user is deleted

**Indexes:**
- `idx_messages_conversation_id` - For fetching messages in a conversation
- `idx_messages_sender_id` - For finding messages by sender
- `idx_messages_created_at` - For ordering messages chronologically

## Views

### conversations_with_last_message

Provides conversation data with the most recent message information for efficient list display.

**Columns:**
- All conversation columns
- last_message_content
- last_message_sender_id
- last_message_at

**Purpose:** Supports Requirement 10.4 (ordering conversations by most recent message)

### unread_message_counts

Calculates unread message counts per conversation per user.

**Columns:**
- user_id
- conversation_id
- unread_count

**Purpose:** Supports Requirement 10.3 (unread message indicator)

## Triggers

### update_conversation_timestamp

Automatically updates the `conversations.updated_at` timestamp when a new message is inserted. This ensures conversations are properly ordered by most recent activity.

## Row Level Security (RLS) Policies

All tables have RLS enabled to ensure users can only access their own conversations and messages.

### conversations

- **SELECT**: Users can only view conversations they are participants in
- **INSERT**: Any authenticated user can create a conversation
- **UPDATE**: Users can update conversations they participate in

### conversation_participants

- **SELECT**: Users can view participants of conversations they're in
- **INSERT**: Users can add themselves to new conversations or add others to conversations they're already in
- **UPDATE**: Users can update their own participant record (e.g., last_read_at)
- **DELETE**: Users can leave conversations (remove themselves)

### messages

- **SELECT**: Users can view messages in conversations they participate in
- **INSERT**: Users can send messages to conversations they're in (must be sender)
- **UPDATE**: Users can update their own messages
- **DELETE**: Users can delete their own messages

## Requirements Validation

This schema satisfies the following requirements:

- **10.1**: Conversation interface structure
- **10.2**: Real-time message delivery (supported by Supabase Realtime on messages table)
- **10.3**: Unread indicator (via last_read_at and unread_message_counts view)
- **10.4**: Conversation ordering (via updated_at and conversations_with_last_message view)
- **10.5**: 1000 character limit (enforced by CHECK constraint)

## Usage Examples

### Creating a conversation between two users

```sql
-- 1. Create the conversation
INSERT INTO conversations DEFAULT VALUES
RETURNING id;

-- 2. Add both users as participants
INSERT INTO conversation_participants (conversation_id, user_id)
VALUES 
  ('conversation-uuid', 'user1-uuid'),
  ('conversation-uuid', 'user2-uuid');
```

### Sending a message

```sql
INSERT INTO messages (conversation_id, sender_id, content)
VALUES ('conversation-uuid', 'sender-uuid', 'Hello!');
-- This automatically updates conversations.updated_at via trigger
```

### Marking messages as read

```sql
UPDATE conversation_participants
SET last_read_at = NOW()
WHERE conversation_id = 'conversation-uuid'
  AND user_id = 'current-user-uuid';
```

### Getting conversations with unread counts

```sql
SELECT 
  c.*,
  u.unread_count
FROM conversations c
JOIN conversation_participants cp ON cp.conversation_id = c.id
LEFT JOIN unread_message_counts u ON u.conversation_id = c.id 
  AND u.user_id = cp.user_id
WHERE cp.user_id = 'current-user-uuid'
ORDER BY c.updated_at DESC;
```
