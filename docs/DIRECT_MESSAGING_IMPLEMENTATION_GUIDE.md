# Direct Messaging Implementation Guide

## Overview

This guide provides implementation details for the direct messaging feature based on the database schema created in migration `005_direct_messaging.sql`.

> **⚠️ IMPORTANT**: If you encounter "infinite recursion detected in policy" errors, apply migration `007_fix_messaging_rls.sql` which fixes the RLS policies. See `docs/MESSAGING_RLS_FIX.md` for details.

## Database Schema Summary

### Tables Created
1. **conversations** - Container for messages between users
2. **conversation_participants** - Links users to conversations (many-to-many)
3. **messages** - Individual messages within conversations

### Views Created
1. **conversations_with_last_message** - Efficient conversation list display
2. **unread_message_counts** - Unread message tracking per user

### Key Features
- Character limit: 1000 characters per message (enforced by CHECK constraint)
- Automatic conversation timestamp updates via trigger
- Comprehensive RLS policies for privacy
- Efficient indexing for performance

## Service Layer Implementation (Task 22)

### messageService.ts Interface

```typescript
interface MessageService {
  // Create a new conversation between users
  createConversation(userIds: string[]): Promise<Conversation>
  
  // Get or create a conversation between two users
  getOrCreateConversation(userId1: string, userId2: string): Promise<Conversation>
  
  // Send a message in a conversation
  sendMessage(conversationId: string, senderId: string, content: string): Promise<Message>
  
  // Get all conversations for a user
  getConversations(userId: string): Promise<ConversationWithMetadata[]>
  
  // Get messages in a conversation
  getMessages(conversationId: string, limit?: number, offset?: number): Promise<Message[]>
  
  // Mark conversation as read
  markAsRead(conversationId: string, userId: string): Promise<void>
  
  // Get unread message count for user
  getUnreadCount(userId: string): Promise<number>
}

interface ConversationWithMetadata {
  id: string
  created_at: string
  updated_at: string
  last_message_content: string | null
  last_message_sender_id: string | null
  last_message_at: string | null
  unread_count: number
  participants: User[]
}
```

## UI Components (Task 23)

### Component Structure

```
Messages Page
├── ConversationList (sidebar)
│   └── ConversationItem (each conversation)
│       ├── Participant avatar/name
│       ├── Last message preview
│       ├── Timestamp
│       └── Unread indicator
└── MessageThread (main area)
    ├── Message header (participant info)
    ├── MessageList (scrollable)
    │   └── MessageBubble (each message)
    └── MessageInput (compose area)
```

### Real-time Updates

Use Supabase Realtime to subscribe to:
1. **messages table** - New messages in active conversation
2. **conversations table** - Conversation list updates

```typescript
// Subscribe to new messages
const subscription = supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // Add new message to UI
  })
  .subscribe()
```

## Requirements Mapping

| Requirement | Implementation |
|-------------|----------------|
| 10.1 - Message button opens conversation | Button in UserProfile → getOrCreateConversation() → navigate to Messages |
| 10.2 - Real-time delivery | Supabase Realtime subscription on messages table |
| 10.3 - Unread indicator | unread_message_counts view + last_read_at tracking |
| 10.4 - Conversation ordering | conversations.updated_at + ORDER BY DESC |
| 10.5 - 1000 char limit | CHECK constraint + client-side validation |

## Implementation Steps

### Step 1: Create messageService.ts
- Implement all service methods
- Add character limit validation (1000 chars)
- Handle conversation creation logic
- Implement efficient queries using views

### Step 2: Create UI Components
- Messages page with routing
- ConversationList component
- MessageThread component
- MessageInput with character counter

### Step 3: Add Real-time Subscriptions
- Subscribe to messages table for active conversation
- Subscribe to conversations table for list updates
- Handle subscription cleanup on unmount

### Step 4: Integrate with Navigation
- Add "Message" button to UserProfile
- Add Messages link to Navbar
- Show unread count badge in navigation

## Testing Considerations

### Property-Based Tests (Optional Tasks)
- **Property 26**: Message delivery - verify messages appear in recipient's conversation
- **Property 29**: Character limit - verify 1000 char enforcement
- **Property 27**: Unread indicator - verify unread count accuracy
- **Property 28**: Conversation ordering - verify most recent first

### Manual Testing Checklist
- [ ] Create conversation between two users
- [ ] Send message and verify real-time delivery
- [ ] Verify character limit enforcement
- [ ] Check unread indicator appears/disappears correctly
- [ ] Verify conversation ordering by most recent message
- [ ] Test marking conversation as read
- [ ] Verify RLS policies prevent unauthorized access

## Performance Considerations

1. **Pagination**: Load messages in batches (e.g., 50 at a time)
2. **Caching**: Cache conversation list to reduce queries
3. **Optimistic Updates**: Update UI immediately, sync with backend
4. **Lazy Loading**: Only subscribe to active conversation's messages

## Security Notes

All RLS policies are in place to ensure:
- Users can only see conversations they participate in
- Users can only send messages to conversations they're in
- Users cannot read other users' private messages
- Proper cascade deletion maintains data integrity

## Next Steps

After implementing direct messaging:
1. Consider adding typing indicators
2. Add message editing/deletion
3. Support for message reactions
4. File/image attachments in messages
5. Message search functionality
