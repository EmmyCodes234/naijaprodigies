# Design Document: NSP Social Feed

## Overview

The NSP Social Feed is a comprehensive social networking feature built for the Nigeria Scrabble Prodigies community. The system transforms the existing mock-based social feed into a fully functional, real-time platform powered by Supabase. The architecture follows a three-tier pattern: React frontend components, Supabase backend services (database, storage, real-time), and a service layer that abstracts data operations.

The design emphasizes real-time interactions, secure data access through Row Level Security (RLS), and a Twitter-inspired user experience with Scrabble-themed terminology. The system will integrate with the existing React/TypeScript codebase and maintain the current UI/UX patterns while adding persistent storage, authentication, and real-time synchronization.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ SocialFeed   │  │  PostCard    │  │ CreatePost   │      │
│  │   Page       │  │  Component   │  │  Component   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ UserProfile  │  │ SearchBar    │  │ FollowButton │      │
│  │   Page       │  │  Component   │  │  Component   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer (TypeScript)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ postService  │  │ userService  │  │ followService│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ imageService │  │ searchService│                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Backend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │   Storage    │  │  Realtime    │      │
│  │   Database   │  │   (Images)   │  │  Channels    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │     Auth     │  │     RLS      │                         │
│  │   (Future)   │  │   Policies   │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: React 18.3.1, TypeScript 5.8.2, React Router 6.22.3
- **Backend**: Supabase (PostgreSQL, Storage, Realtime)
- **State Management**: React hooks (useState, useEffect, useContext)
- **UI Icons**: Iconify React
- **Build Tool**: Vite 6.2.0
- **Styling**: Tailwind CSS (existing)

### Key Architectural Decisions

1. **Service Layer Pattern**: All Supabase interactions are abstracted into service modules to maintain separation of concerns and enable easier testing
2. **Real-time First**: Use Supabase Realtime subscriptions for posts, likes, and comments to provide instant updates
3. **Optimistic UI Updates**: Update UI immediately on user actions, then sync with backend
4. **Image Storage Strategy**: Store images in Supabase Storage with public URLs, reference URLs in database
5. **RLS-First Security**: All data access controlled at database level through Row Level Security policies

## Components and Interfaces

### Core Components

#### 1. SocialFeed Page Component
**Responsibility**: Main feed container, manages feed state and real-time subscriptions

**Props**: None (route component)

**State**:
- `posts: Post[]` - Array of posts to display
- `feedView: 'chronological' | 'forYou'` - Current feed algorithm
- `isLoading: boolean` - Loading state for initial fetch

**Key Methods**:
- `loadInitialPosts()` - Fetch initial batch of posts
- `subscribeToNewPosts()` - Set up Realtime subscription
- `handleInfiniteScroll()` - Load more posts on scroll

#### 2. PostCard Component
**Responsibility**: Display individual post with engagement actions

**Props**:
- `post: Post` - Post data
- `currentUser: User` - Current authenticated user
- `onLike: (postId: string) => void`
- `onComment: (postId: string, content: string) => void`
- `onReRack: (postId: string, type: 'simple' | 'quote', quoteText?: string) => void`

**State**:
- `isLiked: boolean` - Whether current user liked this post
- `localLikeCount: number` - Optimistic like count
- `showComments: boolean` - Toggle comment thread visibility

#### 3. CreatePost Component
**Responsibility**: Post composition interface

**Props**:
- `currentUser: User`
- `onPostCreated: (post: Post) => void`
- `replyTo?: Post` - Optional, for quote re-racks

**State**:
- `content: string` - Post text content
- `selectedImages: File[]` - Images to upload
- `imagePreviews: string[]` - Local preview URLs
- `isUploading: boolean` - Upload progress state
- `charCount: number` - Character counter

#### 4. UserProfile Page Component
**Responsibility**: Display user profile and their posts

**Props**: None (route component, uses URL params)

**State**:
- `user: User | null` - Profile user data
- `posts: Post[]` - User's posts
- `activeTab: 'posts' | 'media' | 'liked'` - Content filter
- `isFollowing: boolean` - Follow relationship state

#### 5. SearchBar Component
**Responsibility**: Global search interface

**Props**:
- `onResultSelect: (result: User | Post) => void`

**State**:
- `query: string` - Search input
- `results: SearchResults` - Combined user and post results
- `isSearching: boolean` - Loading state

#### 6. FollowButton Component
**Responsibility**: Follow/unfollow action button

**Props**:
- `targetUserId: string`
- `currentUserId: string`
- `initialFollowState: boolean`

**State**:
- `isFollowing: boolean` - Current follow state
- `isProcessing: boolean` - Prevent double-clicks

### Service Layer Interfaces

#### postService.ts
```typescript
interface PostService {
  createPost(userId: string, content: string, imageUrls?: string[]): Promise<Post>
  getPosts(limit: number, offset: number): Promise<Post[]>
  getPostById(postId: string): Promise<Post>
  deletePost(postId: string, userId: string): Promise<void>
  likePost(postId: string, userId: string): Promise<void>
  unlikePost(postId: string, userId: string): Promise<void>
  createComment(postId: string, userId: string, content: string): Promise<Comment>
  createReRack(postId: string, userId: string, quoteText?: string): Promise<Post>
}
```

#### userService.ts
```typescript
interface UserService {
  getUserById(userId: string): Promise<User>
  getUserByHandle(handle: string): Promise<User>
  updateUserProfile(userId: string, updates: Partial<User>): Promise<User>
  getUserPosts(userId: string, filter: 'posts' | 'media' | 'liked'): Promise<Post[]>
  getFollowers(userId: string): Promise<User[]>
  getFollowing(userId: string): Promise<User[]>
}
```

#### followService.ts
```typescript
interface FollowService {
  followUser(followerId: string, followingId: string): Promise<void>
  unfollowUser(followerId: string, followingId: string): Promise<void>
  isFollowing(followerId: string, followingId: string): Promise<boolean>
  getFollowerCount(userId: string): Promise<number>
  getFollowingCount(userId: string): Promise<number>
}
```

#### imageService.ts
```typescript
interface ImageService {
  uploadImage(file: File, userId: string): Promise<string>
  uploadImages(files: File[], userId: string): Promise<string[]>
  deleteImage(imageUrl: string): Promise<void>
  generatePreview(file: File): Promise<string>
}
```

#### searchService.ts
```typescript
interface SearchService {
  searchUsers(query: string): Promise<User[]>
  searchPosts(query: string): Promise<Post[]>
  searchHashtags(hashtag: string): Promise<Post[]>
  searchAll(query: string): Promise<SearchResults>
}

interface SearchResults {
  users: User[]
  posts: Post[]
}
```

## Data Models

### Database Schema

#### users table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  handle TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  bio TEXT,
  rank TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### posts table
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 280),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_rerack BOOLEAN DEFAULT false,
  original_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  quote_text TEXT
);
```

#### post_images table
```sql
CREATE TABLE post_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### likes table
```sql
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
```

#### comments table
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### follows table
```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);
```

### TypeScript Type Definitions

```typescript
export interface User {
  id: string
  handle: string
  name: string
  avatar: string | null
  bio: string | null
  rank: string | null
  verified: boolean
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  user_id: string
  user: User
  content: string
  images: string[]
  likes_count: number
  comments_count: number
  reracks_count: number
  created_at: string
  is_rerack: boolean
  original_post?: Post
  quote_text?: string
  is_liked_by_current_user?: boolean
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  user: User
  content: string
  parent_comment_id: string | null
  created_at: string
  replies?: Comment[]
}

export interface Like {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}
```

### Database Views for Performance

#### posts_with_counts view
```sql
CREATE VIEW posts_with_counts AS
SELECT 
  p.*,
  COUNT(DISTINCT l.id) as likes_count,
  COUNT(DISTINCT c.id) as comments_count,
  COUNT(DISTINCT r.id) as reracks_count
FROM posts p
LEFT JOIN likes l ON p.id = l.post_id
LEFT JOIN comments c ON p.id = c.post_id
LEFT JOIN posts r ON p.id = r.original_post_id
GROUP BY p.id;
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Post character limit enforcement
*For any* post content string, if the content exceeds 280 characters, the system should reject the post creation; if the content is 280 characters or fewer, the system should accept it.
**Validates: Requirements 1.1**

### Property 2: Image attachment count validation
*For any* array of images attached to a post, the system should accept the post if the array contains 1-4 images and reject it if the array contains 0 images or more than 4 images.
**Validates: Requirements 1.2**

### Property 3: Image storage round-trip
*For any* uploaded image file, storing it in Supabase Storage and then retrieving it via the generated URL should return the same image data.
**Validates: Requirements 1.3**

### Property 4: Hashtag preservation
*For any* post content containing hashtags (strings starting with #), after creating and retrieving the post, the hashtags should remain present and properly formatted in the content.
**Validates: Requirements 1.4**

### Property 5: Mention link generation
*For any* post content containing @mentions, the rendered post output should contain clickable links to the mentioned users' profiles.
**Validates: Requirements 1.5**

### Property 6: Reverse chronological ordering
*For any* set of posts with different timestamps, the feed should return them ordered from newest to oldest based on created_at timestamp.
**Validates: Requirements 2.1**

### Property 7: Pagination consistency
*For any* two consecutive pagination requests, the second batch should not contain any posts from the first batch, and all posts should eventually be retrievable through pagination.
**Validates: Requirements 2.2**

### Property 8: Like action increments count
*For any* post, when a user who hasn't previously liked it performs a like action, the like count should increase by exactly 1 and the like should be recorded for that user.
**Validates: Requirements 3.1**

### Property 9: Comment threading support
*For any* comment, the system should allow creating a reply to that comment, and the reply should be associated with the parent comment through parent_comment_id.
**Validates: Requirements 3.3**

### Property 10: Simple re-rack creates reference
*For any* post, performing a simple re-rack should create a new post with is_rerack=true, original_post_id pointing to the original, and no quote_text.
**Validates: Requirements 3.5**

### Property 11: Quote re-rack includes commentary
*For any* post and any non-empty commentary text, performing a quote re-rack should create a new post with is_rerack=true, original_post_id pointing to the original, and quote_text containing the commentary.
**Validates: Requirements 3.6**

### Property 12: Engagement counts reflect state
*For any* post, the displayed counts for likes, comments, and re-racks should match the actual number of records in the respective tables for that post.
**Validates: Requirements 3.7**

### Property 13: Follower counts accuracy
*For any* user, the displayed follower count should equal the number of follow records where following_id equals the user's id, and the following count should equal the number where follower_id equals the user's id.
**Validates: Requirements 4.2**

### Property 14: Profile edit persistence
*For any* user profile update (avatar, bio, or rank), after saving the changes and retrieving the profile, the updated values should be reflected.
**Validates: Requirements 4.5**

### Property 15: Follow action creates relationship
*For any* two distinct users A and B, when A follows B, a follow record should be created with follower_id=A and following_id=B, and both users' follower/following counts should increment by 1.
**Validates: Requirements 5.1**

### Property 16: Follow-unfollow round-trip
*For any* two users, following and then immediately unfollowing should return both users to their original follower/following counts and remove the follow relationship.
**Validates: Requirements 5.2**

### Property 17: Follow button state consistency
*For any* user viewing another user's profile, the Follow/Unfollow button state should match the actual existence of a follow relationship in the database.
**Validates: Requirements 5.4**

### Property 18: Search completeness
*For any* search query, the results should include all users whose handle or name contains the query and all posts whose content contains the query.
**Validates: Requirements 6.1, 6.4**

### Property 19: Username search prioritization
*For any* search query that exactly matches a user's handle, that user should appear first in the user results.
**Validates: Requirements 6.2**

### Property 20: Hashtag search completeness
*For any* hashtag search query, the results should include all posts that contain that exact hashtag in their content.
**Validates: Requirements 6.3**

### Property 21: Post ownership authorization
*For any* post edit or delete operation, the system should allow the operation only if the requesting user's id matches the post's user_id, and reject it otherwise.
**Validates: Requirements 7.3**

### Property 22: RLS policy enforcement
*For any* database operation, the system should enforce Row Level Security policies, preventing unauthorized reads and writes based on the current user's identity.
**Validates: Requirements 7.1, 7.2**

### Property 23: Cascade deletion integrity
*For any* user deletion, all related posts, comments, likes, and follow relationships should be automatically removed from the database through foreign key cascades.
**Validates: Requirements 7.5**

### Property 24: Rate limiting enforcement
*For any* user attempting to create posts or follow/unfollow users at a rate exceeding the defined limit, the system should reject subsequent requests until the rate limit window resets.
**Validates: Requirements 8.1, 8.2**

### Property 25: Image preview generation
*For any* selected image file, the system should generate a local preview URL instantly (synchronously) before any upload to Supabase Storage begins.
**Validates: Requirements 9.1**

### Property 26: Direct message delivery
*For any* direct message sent from user A to user B, the message should appear in user B's conversation with user A in real-time.
**Validates: Requirements 10.2**

### Property 27: Unread message indicator
*For any* user with unread messages, the messages icon should display an unread indicator; when all messages are read, the indicator should disappear.
**Validates: Requirements 10.3**

### Property 28: Conversation ordering
*For any* set of conversations, they should be displayed ordered by the timestamp of the most recent message in each conversation, newest first.
**Validates: Requirements 10.4**

### Property 29: Message character limit
*For any* message content, if it is 1000 characters or fewer, the system should accept it; if it exceeds 1000 characters, the system should reject it.
**Validates: Requirements 10.5**

### Property 30: Notification creation on engagement
*For any* engagement action (like, comment, or follow), the system should create a notification for the relevant user (post author or followed user).
**Validates: Requirements 11.1, 11.2, 11.3**

### Property 31: Notification ordering
*For any* set of notifications for a user, they should be displayed in reverse chronological order by created_at timestamp.
**Validates: Requirements 11.4**

### Property 32: Notification read state
*For any* notification, when viewed by the user, it should be marked as read and the user's unread notification count should decrease by 1.
**Validates: Requirements 11.5**

### Property 33: Bookmark creation
*For any* post, when a user bookmarks it, a bookmark record should be created associating the user and post.
**Validates: Requirements 12.1**

### Property 34: Bookmark ordering
*For any* user's bookmarks, they should be displayed in reverse chronological order based on when they were bookmarked.
**Validates: Requirements 12.2**

### Property 35: Bookmark toggle round-trip
*For any* post, bookmarking and then unbookmarking should remove the bookmark record and return to the original state.
**Validates: Requirements 12.3**

### Property 36: Bookmark button state
*For any* post, the bookmark button state should reflect whether a bookmark record exists for the current user and that post.
**Validates: Requirements 12.4**

### Property 37: Bookmark cascade deletion
*For any* post deletion, all bookmark records referencing that post should be automatically removed.
**Validates: Requirements 12.5**

### Property 38: Mute filters feed
*For any* user A who mutes user B, posts created by user B should not appear in user A's feed.
**Validates: Requirements 13.1**

### Property 39: Block prevents access
*For any* user A who blocks user B, user B should not be able to view user A's profile or posts.
**Validates: Requirements 13.2**

### Property 40: Block removes follows
*For any* user A who blocks user B, any existing follow relationships between A and B (in either direction) should be removed.
**Validates: Requirements 13.3**

### Property 41: For You feed relevance ranking
*For any* user viewing the "For You" feed, posts should be ordered by a relevance score that incorporates engagement metrics, user interests, and recency.
**Validates: Requirements 14.1, 14.2, 14.3, 14.4**

### Property 42: Algorithm adaptation
*For any* new user interaction (like, comment, follow), subsequent "For You" feed requests should reflect the updated user preferences in the ranking.
**Validates: Requirements 14.5**

### Property 43: Trending hashtags calculation
*For any* hashtag, it should appear in the trending list if and only if it has been used frequently in posts created within the past 24 hours.
**Validates: Requirements 15.1, 15.2**

### Property 44: Trending hashtag click
*For any* trending hashtag, clicking it should display all posts containing that exact hashtag.
**Validates: Requirements 15.3**

### Property 45: Trending hashtag counts
*For any* trending hashtag, the displayed post count should match the actual number of posts containing that hashtag in the past 24 hours.
**Validates: Requirements 15.4**

### Property 46: Trending expiration
*For any* hashtag that has not been used in recent posts, it should not appear in the trending list.
**Validates: Requirements 15.5**

### Property 47: Verification status persistence
*For any* user, when an administrator sets verified=true, the user's verified status should be persisted and reflected in all displays of that user.
**Validates: Requirements 16.1, 16.2**

### Property 48: Verification removal
*For any* verified user, when an administrator sets verified=false, all verification badges should be removed from the user's posts and profile.
**Validates: Requirements 16.4**

### Property 49: Post analytics accuracy
*For any* post, the displayed analytics (views, likes, comments, re-racks) should match the actual counts from the respective database tables.
**Validates: Requirements 17.1**

### Property 50: Profile analytics aggregation
*For any* user, the total engagement metrics should equal the sum of engagement across all their posts.
**Validates: Requirements 17.2**

### Property 51: Analytics time-series accuracy
*For any* time period (day, week, month), the engagement metrics for that period should match the actual interactions that occurred during that time range.
**Validates: Requirements 17.3**

### Property 52: Unique reach counting
*For any* post, the reach metric should count each user who viewed the post exactly once, regardless of how many times they viewed it.
**Validates: Requirements 17.4**

### Property 53: Real-time analytics updates
*For any* new interaction with a post, the analytics for that post should be updated immediately to reflect the new interaction.
**Validates: Requirements 17.5**

## Error Handling

### Error Categories

1. **Validation Errors**
   - Character limit exceeded (280 chars)
   - Invalid image count (0 or >4)
   - Empty required fields
   - Invalid user handles in mentions

2. **Authorization Errors**
   - Attempting to edit/delete another user's post
   - Accessing private data without permission
   - RLS policy violations

3. **Rate Limiting Errors**
   - Too many posts in time window
   - Too many follow/unfollow actions
   - Exceeded API quota

4. **Network/Storage Errors**
   - Image upload failures
   - Supabase connection errors
   - Realtime subscription failures

5. **Data Integrity Errors**
   - Duplicate likes (handled by UNIQUE constraint)
   - Self-follow attempts (handled by CHECK constraint)
   - Orphaned references

### Error Handling Strategy

**Client-Side Validation**:
- Validate character count before submission
- Check image count before upload
- Provide immediate feedback to user

**Service Layer Error Handling**:
```typescript
try {
  const result = await supabaseOperation()
  return { success: true, data: result }
} catch (error) {
  if (error.code === '23505') {
    // Unique constraint violation
    return { success: false, error: 'Duplicate action' }
  } else if (error.code === '42501') {
    // RLS policy violation
    return { success: false, error: 'Unauthorized' }
  }
  // Log unexpected errors
  console.error('Unexpected error:', error)
  return { success: false, error: 'An unexpected error occurred' }
}
```

**Optimistic UI with Rollback**:
- Update UI immediately on user action
- If backend operation fails, revert UI to previous state
- Show error toast notification

**Retry Logic**:
- Implement exponential backoff for network errors
- Maximum 3 retry attempts for transient failures
- User notification after final failure

**Graceful Degradation**:
- If Realtime fails, fall back to polling
- If image upload fails, allow post without images
- Cache data locally for offline resilience

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples, edge cases, and component behavior:

**Component Tests**:
- PostCard renders correctly with all post data
- CreatePost enforces character limit in UI
- FollowButton shows correct state
- SearchBar displays results correctly

**Service Tests**:
- postService.createPost with valid data succeeds
- postService.createPost with >280 chars fails
- imageService.uploadImage handles file upload
- followService.followUser prevents self-follow

**Edge Cases**:
- Empty post content
- Exactly 280 characters
- 0 images, 1 image, 4 images, 5 images
- Searching with empty query
- Following already-followed user

### Property-Based Testing

Property-based testing will verify universal properties across all inputs using **fast-check** (JavaScript/TypeScript property testing library).

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with format: `**Feature: nsp-social-feed, Property {number}: {property_text}**`
- Each correctness property implemented as a single property-based test

**Test Examples**:

```typescript
// Property 1: Post character limit enforcement
test('Property 1: Character limit enforcement', () => {
  fc.assert(
    fc.property(fc.string(), async (content) => {
      const result = await postService.createPost(userId, content)
      if (content.length <= 280) {
        expect(result.success).toBe(true)
      } else {
        expect(result.success).toBe(false)
      }
    }),
    { numRuns: 100 }
  )
})

// Property 6: Reverse chronological ordering
test('Property 6: Reverse chronological ordering', () => {
  fc.assert(
    fc.property(fc.array(fc.record({ content: fc.string(), timestamp: fc.date() })), 
      async (posts) => {
        // Create posts with different timestamps
        for (const post of posts) {
          await createPostWithTimestamp(post.content, post.timestamp)
        }
        
        const feed = await postService.getPosts(100, 0)
        
        // Verify ordering
        for (let i = 0; i < feed.length - 1; i++) {
          expect(feed[i].created_at >= feed[i + 1].created_at).toBe(true)
        }
      }
    ),
    { numRuns: 100 }
  )
})
```

**Generators**:
- Random post content (various lengths)
- Random user data
- Random image files (mock File objects)
- Random timestamps
- Random follow relationships

### Integration Testing

Integration tests will verify end-to-end workflows:

- User creates post → post appears in feed
- User likes post → like count updates → unlike removes like
- User follows another → follower count updates → feed shows followed user's posts
- User searches → results include relevant users and posts
- User uploads images → images stored → URLs accessible

### Real-Time Testing

Verify Supabase Realtime functionality:

- Subscribe to posts table → create post → subscription receives event
- Multiple clients subscribed → one creates post → all receive update
- Subscription handles reconnection after network interruption

### Security Testing

Verify RLS policies and authorization:

- User A cannot edit User B's post
- User cannot access posts from blocked users 
- Unauthenticated requests are rejected
- SQL injection attempts are prevented

### Performance Testing

- Feed loads within 2 seconds for 50 posts
- Image upload completes within 5 seconds for 4 images
- Search returns results within 1 second
- Infinite scroll loads next batch within 1 second

## Implementation Phases

### Phase 1: Foundation (Database & Auth)
- Set up Supabase project
- Create database schema
- Implement RLS policies
- Set up authentication (mock user for now)
- Create service layer structure

### Phase 2: Core Post Functionality
- Implement post creation
- Implement post display in feed
- Add reverse chronological ordering
- Implement infinite scroll
- Add Realtime subscriptions for new posts

### Phase 3: Engagement Features
- Implement like functionality
- Implement comment system with threading
- Implement re-rack (simple and quote)
- Update engagement counts in real-time

### Phase 4: User Profiles & Social Graph
- Implement user profile pages
- Add follow/unfollow functionality
- Display follower/following lists
- Filter user posts by type (posts/media/liked)

### Phase 5: Media & Search
- Implement image upload to Supabase Storage
- Add image preview generation
- Implement search functionality (users, posts, hashtags)
- Add search result ranking

### Phase 6: Polish & Security
- Implement rate limiting
- Add comprehensive error handling
- Optimize database queries
- Add loading states and animations
- Conduct security audit

## Additional Features

### Direct Messaging

**Architecture**: Real-time messaging using Supabase Realtime channels

**Database Schema**:
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
```

### Notifications

**Architecture**: Event-driven notification system with real-time delivery

**Database Schema**:
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

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at);
```

**Notification Triggers**: Database triggers to automatically create notifications on like, comment, follow events

### Bookmarks

**Database Schema**:
```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id, created_at DESC);
```

### Muting and Blocking

**Database Schema**:
```sql
CREATE TABLE mutes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  muted_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, muted_user_id),
  CHECK (user_id != muted_user_id)
);

CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, blocked_user_id),
  CHECK (user_id != blocked_user_id)
);
```

**RLS Integration**: Update RLS policies to respect mute/block relationships when filtering feed content

### "For You" Algorithm

**Scoring Formula**:
```
score = (engagement_score * 0.4) + (relevance_score * 0.4) + (recency_score * 0.2)

engagement_score = (likes * 1) + (comments * 2) + (reracks * 3)
relevance_score = based on user's followed users, liked posts, and interaction history
recency_score = exponential decay based on post age
```

**Implementation**: PostgreSQL function that calculates scores and returns ranked posts

### Trending Hashtags

**Database Schema**:
```sql
CREATE TABLE hashtag_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hashtag TEXT NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hashtag_usage_tag_time ON hashtag_usage(hashtag, created_at DESC);
```

**Calculation**: Aggregate hashtag usage over rolling 24-hour window, rank by frequency

**Caching**: Cache trending results for 15 minutes to reduce database load

### User Verification

**Implementation**: Add `verified` boolean field to users table (already exists in schema)

**Admin Interface**: Separate admin panel or API endpoint for verification management

**Badge Display**: Verification badge shown in PostCard, UserProfile, and search results

### Post Analytics

**Database Schema**:
```sql
CREATE TABLE post_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_post_views_post ON post_views(post_id, viewed_at DESC);
CREATE INDEX idx_post_views_user ON post_views(user_id, viewed_at DESC);
```

**Analytics Aggregation**:
```sql
CREATE VIEW post_analytics AS
SELECT 
  p.id as post_id,
  p.user_id,
  COUNT(DISTINCT pv.user_id) as unique_views,
  COUNT(DISTINCT l.id) as likes,
  COUNT(DISTINCT c.id) as comments,
  COUNT(DISTINCT r.id) as reracks,
  (COUNT(DISTINCT l.id) + COUNT(DISTINCT c.id) * 2 + COUNT(DISTINCT r.id) * 3) as engagement_score
FROM posts p
LEFT JOIN post_views pv ON p.id = pv.post_id
LEFT JOIN likes l ON p.id = l.post_id
LEFT JOIN comments c ON p.id = c.post_id
LEFT JOIN posts r ON p.id = r.original_post_id
GROUP BY p.id, p.user_id;
```

**Privacy**: Only post authors can view detailed analytics for their own posts

## Future Enhancements

- Mobile app (React Native)
- Push notifications
- Video upload support
- Live streaming for tournaments
- Polls in posts
- Post scheduling
- Advanced content moderation tools
- Multi-language support
