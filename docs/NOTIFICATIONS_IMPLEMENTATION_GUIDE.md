# Notifications Implementation Guide

This guide provides step-by-step instructions for implementing the notifications feature in the NSP Social Feed application.

## Prerequisites

- Supabase project set up and configured
- Previous migrations (001-005) applied
- Authentication system in place

## Step 1: Apply Database Migration

Apply the notifications schema migration to your Supabase database:

### Option A: Using Supabase CLI
```bash
supabase db push
```

### Option B: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/006_notifications.sql`
4. Paste and execute the SQL

### Verify Migration
After applying the migration, verify the following were created:

**Tables:**
- `notifications`

**Triggers:**
- `trigger_like_notification` (on likes table)
- `trigger_comment_notification` (on comments table)
- `trigger_follow_notification` (on follows table)
- `trigger_rerack_notification` (on posts table)

**Functions:**
- `create_like_notification()`
- `create_comment_notification()`
- `create_follow_notification()`
- `create_rerack_notification()`
- `create_mention_notification(p_mentioned_user_id, p_post_id, p_actor_id)`
- `get_unread_notification_count(p_user_id)`

**Views:**
- `notifications_with_details`

**RLS Policies:**
- Users can view own notifications
- Users can update own notifications
- Users can delete own notifications
- System can insert notifications

## Step 2: Understand Automatic Notifications

The following notifications are created **automatically** via database triggers:

### Like Notifications
When a user likes a post, a notification is automatically sent to the post author (unless the liker is the author).

```typescript
// No special code needed - just like the post normally
await postService.likePost(postId, userId);
// Notification is created automatically by trigger
```

### Comment Notifications
When a user comments on a post, a notification is automatically sent to the post author (unless the commenter is the author).

```typescript
// No special code needed - just create the comment normally
await postService.createComment(postId, userId, content);
// Notification is created automatically by trigger
```

### Follow Notifications
When a user follows another user, a notification is automatically sent to the followed user.

```typescript
// No special code needed - just follow normally
await followService.followUser(followerId, followingId);
// Notification is created automatically by trigger
```

### Re-Rack Notifications
When a user re-racks a post, a notification is automatically sent to the original post author (unless the re-racker is the author).

```typescript
// No special code needed - just create the re-rack normally
await postService.createReRack(postId, userId, quoteText);
// Notification is created automatically by trigger
```

## Step 3: Implement Mention Notifications

Mention notifications require application-level parsing and must be called explicitly:

```typescript
// In postService.ts - after creating a post
async function createPost(userId: string, content: string, imageUrls?: string[]): Promise<Post> {
  // Create the post
  const { data: post, error } = await supabase
    .from('posts')
    .insert({ user_id: userId, content, ... })
    .select()
    .single();

  if (error) throw error;

  // Parse mentions from content
  const mentions = extractMentions(content); // e.g., ['@johndoe', '@janedoe']
  
  // Create mention notifications
  for (const mention of mentions) {
    const mentionedUser = await getUserByHandle(mention.replace('@', ''));
    if (mentionedUser) {
      await supabase.rpc('create_mention_notification', {
        p_mentioned_user_id: mentionedUser.id,
        p_post_id: post.id,
        p_actor_id: userId
      });
    }
  }

  return post;
}
```

## Step 4: Create Notification Service

Create `services/notificationService.ts`:

```typescript
import { supabase } from './supabaseClient';
import { Notification } from '../types';

export const notificationService = {
  // Get user's notifications
  async getNotifications(userId: string, limit = 50): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications_with_details')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  // Get unread notifications
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications_with_details')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('get_unread_notification_count', { p_user_id: userId });

    if (error) throw error;
    return data || 0;
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
  },

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  },

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  },

  // Subscribe to real-time notifications
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
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
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return subscription;
  }
};
```

## Step 5: Create Notification UI Components

### Notification Bell Icon (in Navbar)

```typescript
import { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import { useCurrentUser } from '../hooks/useCurrentUser';

export function NotificationBell() {
  const { user } = useCurrentUser();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Load initial count
    notificationService.getUnreadCount(user.id).then(setUnreadCount);

    // Subscribe to new notifications
    const subscription = notificationService.subscribeToNotifications(
      user.id,
      () => {
        // Increment count when new notification arrives
        setUnreadCount(prev => prev + 1);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return (
    <button className="relative">
      <Icon icon="mdi:bell" className="text-2xl" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
```

### Notifications Page

```typescript
import { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import { Notification } from '../types';
import { useCurrentUser } from '../hooks/useCurrentUser';

export function NotificationsPage() {
  const { user } = useCurrentUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    loadNotifications();

    // Subscribe to new notifications
    const subscription = notificationService.subscribeToNotifications(
      user.id,
      (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  async function loadNotifications() {
    if (!user) return;
    
    try {
      const data = await notificationService.getNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(notificationId: string) {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function handleMarkAllAsRead() {
    if (!user) return;
    
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  if (loading) return <div>Loading notifications...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button
          onClick={handleMarkAllAsRead}
          className="text-blue-500 hover:underline"
        >
          Mark all as read
        </button>
      </div>

      <div className="space-y-2">
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={handleMarkAsRead}
          />
        ))}
      </div>
    </div>
  );
}
```

## Step 6: Testing

### Test Automatic Notifications

1. **Like Notification**: Like a post and verify the post author receives a notification
2. **Comment Notification**: Comment on a post and verify the post author receives a notification
3. **Follow Notification**: Follow a user and verify they receive a notification
4. **Re-Rack Notification**: Re-rack a post and verify the original author receives a notification

### Test Mention Notifications

1. Create a post with @mentions
2. Verify mentioned users receive notifications
3. Verify self-mentions don't create notifications

### Test Real-Time Updates

1. Open the app in two browser windows with different users
2. Perform an action in one window (like, comment, follow)
3. Verify the notification appears in real-time in the other window

### Test Read/Unread State

1. View notifications page
2. Verify unread count updates when marking as read
3. Verify "mark all as read" works correctly

## Troubleshooting

### Notifications Not Being Created

1. Check that triggers are installed:
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE '%notification%';
```

2. Check trigger functions exist:
```sql
SELECT proname FROM pg_proc WHERE proname LIKE '%notification%';
```

3. Check RLS policies allow insertion:
```sql
SELECT * FROM pg_policies WHERE tablename = 'notifications';
```

### Real-Time Not Working

1. Verify Realtime is enabled in Supabase dashboard
2. Check that the notifications table has Realtime enabled
3. Verify the subscription filter matches the user_id

### Performance Issues

1. Verify indexes are created:
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'notifications';
```

2. Consider pagination for large notification lists
3. Consider archiving old notifications

## Next Steps

After implementing the notifications database schema:

1. Implement the notification service (Task 25)
2. Create notification UI components (Task 26)
3. Test all notification types
4. Add notification preferences (optional)
5. Implement notification grouping (optional)

## Related Documentation

- `docs/NOTIFICATIONS_SCHEMA.md` - Detailed schema documentation
- `supabase/migrations/006_notifications.sql` - Migration file
- `supabase/DATABASE_REFERENCE.md` - Database reference guide

