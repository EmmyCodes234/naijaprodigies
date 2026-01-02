# Rate Limiting Implementation

## Overview

The NSP Social Feed implements client-side rate limiting to prevent abuse and protect Supabase resources. This document describes the rate limiting system and how to use it.

## Rate Limits

### Post Creation
- **Limit**: 10 posts per hour
- **Window**: Rolling 1-hour window
- **Action Type**: `post_creation`

### Follow/Unfollow Actions
- **Limit**: 50 actions per hour
- **Window**: Rolling 1-hour window
- **Action Type**: `follow_action`
- **Note**: Follow and unfollow actions share the same limit

## Architecture

### RateLimiter Class (`utils/rateLimiter.ts`)

The rate limiter is implemented as a singleton class that tracks user actions in memory using a Map data structure.

**Key Methods**:
- `checkLimit(userId, actionType)` - Check if an action is allowed
- `recordAction(userId, actionType)` - Record a successful action
- `getRemainingRequests(userId, actionType)` - Get remaining requests
- `getTimeUntilReset(userId, actionType)` - Get time until limit resets
- `clearUser(userId)` - Clear rate limit data for a user
- `clearAll()` - Clear all rate limit data

### RateLimitError Class

Custom error class that includes:
- `message` - Human-readable error message with time until reset
- `actionType` - The action type that was rate limited
- `retryAfter` - Milliseconds until the user can retry

## Integration

### Post Service

The `createPost` function checks the rate limit before creating a post:

```typescript
if (!rateLimiter.checkLimit(userId, 'post_creation')) {
  const timeUntilReset = rateLimiter.getTimeUntilReset(userId, 'post_creation')
  const formattedTime = formatTimeUntilReset(timeUntilReset)
  throw new RateLimitError(
    `Rate limit exceeded. You can create more posts in ${formattedTime}. Limit: 10 posts per hour.`,
    'post_creation',
    timeUntilReset
  )
}
```

After successful post creation, the action is recorded:

```typescript
rateLimiter.recordAction(userId, 'post_creation')
```

### Follow Service

Both `followUser` and `unfollowUser` functions implement the same pattern:

```typescript
if (!rateLimiter.checkLimit(followerId, 'follow_action')) {
  const timeUntilReset = rateLimiter.getTimeUntilReset(followerId, 'follow_action')
  const formattedTime = formatTimeUntilReset(timeUntilReset)
  throw new RateLimitError(
    `Rate limit exceeded. You can perform more follow actions in ${formattedTime}. Limit: 50 actions per hour.`,
    'follow_action',
    timeUntilReset
  )
}
```

### UI Components

#### CreatePost Component

Catches `RateLimitError` and displays the error message to the user:

```typescript
catch (err) {
  if (err instanceof RateLimitError) {
    setError(err.message)
  } else {
    const errorMessage = err instanceof Error ? err.message : 'Failed to create post'
    setError(errorMessage)
  }
}
```

#### FollowButton Component

Shows an alert with the rate limit error message:

```typescript
catch (error) {
  if (error instanceof RateLimitError) {
    alert(error.message)
  } else if (error instanceof Error && error.message === 'Cannot follow yourself') {
    alert('You cannot follow yourself')
  } else {
    alert('Failed to update follow status. Please try again.')
  }
}
```

## Error Messages

Rate limit error messages include:
1. Clear indication that the rate limit was exceeded
2. Time until the user can perform the action again (formatted as seconds, minutes, or hours)
3. The specific limit that was exceeded

**Example Messages**:
- "Rate limit exceeded. You can create more posts in 45 minutes. Limit: 10 posts per hour."
- "Rate limit exceeded. You can perform more follow actions in 2 hours. Limit: 50 actions per hour."

## Testing

### Unit Tests (`utils/rateLimiter.test.ts`)

Tests the core rate limiter functionality:
- Allows actions within limits
- Blocks actions after exceeding limits
- Tracks remaining requests correctly
- Manages time windows properly
- Isolates different action types
- Handles user-specific data

### Integration Tests (`services/rateLimiting.integration.test.ts`)

Tests rate limiting integration with services:
- Post creation rate limiting
- Follow/unfollow action rate limiting
- Error message formatting
- Per-user tracking
- Action type isolation

## Limitations

### Client-Side Only

This implementation is **client-side only**. For production use, you should also implement:

1. **Server-Side Rate Limiting**: Use Supabase Edge Functions or a backend API to enforce rate limits at the server level
2. **Persistent Storage**: Store rate limit data in a database or Redis to survive page refreshes and work across devices
3. **IP-Based Limiting**: Add IP-based rate limiting to prevent abuse from multiple accounts

### Memory Storage

Rate limit data is stored in memory and will be lost on page refresh. This is acceptable for the current implementation but should be enhanced for production.

## Future Enhancements

1. **Persistent Storage**: Store rate limit data in localStorage or a database
2. **Server-Side Enforcement**: Implement rate limiting in Supabase Edge Functions
3. **Dynamic Limits**: Allow different limits for verified users or premium accounts
4. **Rate Limit Headers**: Return rate limit information in API responses
5. **Gradual Backoff**: Implement exponential backoff for repeated violations
6. **Admin Override**: Allow administrators to bypass or adjust rate limits

## Configuration

To modify rate limits, update the configuration in `utils/rateLimiter.ts`:

```typescript
// Configure rate limits according to requirements
rateLimiter.configure('post_creation', 10, 60 * 60 * 1000) // 10 posts per hour
rateLimiter.configure('follow_action', 50, 60 * 60 * 1000) // 50 actions per hour
```

To add new rate-limited actions:

```typescript
// Configure the new action type
rateLimiter.configure('new_action', maxRequests, windowMs)

// Check and record in your service
if (!rateLimiter.checkLimit(userId, 'new_action')) {
  throw new RateLimitError(...)
}
// ... perform action ...
rateLimiter.recordAction(userId, 'new_action')
```
