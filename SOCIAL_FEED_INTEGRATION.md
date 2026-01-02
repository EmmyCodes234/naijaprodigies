# Social Feed Integration Guide

Quick reference for working with the real Social Feed data.

## Current State

✅ **Working:**
- User authentication
- Fetching posts from Supabase
- Creating new posts
- Displaying posts with images
- Loading and error states
- Empty state handling

⚠️ **TODO:**
- Like/unlike posts
- Comment on posts
- Display comments
- Real-time updates
- Infinite scroll

## How to Use

### Fetch Posts

```typescript
import { getPosts } from '../services/postService';

const posts = await getPosts(50, 0); // limit, offset
```

### Create a Post

```typescript
import { createPost } from '../services/postService';
import { useCurrentUser } from '../hooks/useCurrentUser';

const { profile } = useCurrentUser();

const newPost = await createPost(
  profile.id,
  'Hello world!',
  ['https://example.com/image.jpg'] // optional images
);
```

### Get Current User

```typescript
import { useCurrentUser } from '../hooks/useCurrentUser';

function MyComponent() {
  const { profile, loading, error } = useCurrentUser();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!profile) return <div>Not authenticated</div>;
  
  return <div>Hello, {profile.name}!</div>;
}
```

### Format Timestamps

```typescript
import { formatRelativeTime } from '../utils/dateUtils';

const timeAgo = formatRelativeTime('2024-01-15T10:30:00Z');
// Returns: "2h", "5m", "3d", etc.
```

## Database Schema

### Posts Table
```sql
posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  content TEXT (max 280 chars),
  created_at TIMESTAMPTZ,
  is_rerack BOOLEAN,
  original_post_id UUID,
  quote_text TEXT
)
```

### Post Images Table
```sql
post_images (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id),
  image_url TEXT,
  position INTEGER (1-4)
)
```

### Users Table
```sql
users (
  id UUID PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id),
  handle TEXT UNIQUE,
  name TEXT,
  avatar TEXT,
  bio TEXT,
  rank TEXT,
  verified BOOLEAN
)
```

## API Reference

### postService.ts

#### `createPost(userId, content, imageUrls?)`
Creates a new post with optional images.

**Parameters:**
- `userId: string` - ID of the user creating the post
- `content: string` - Post content (max 280 chars)
- `imageUrls?: string[]` - Optional array of image URLs (max 4)

**Returns:** `Promise<Post>`

**Throws:**
- Error if content exceeds 280 characters
- Error if content is empty
- Error if database operation fails

#### `getPosts(limit?, offset?)`
Fetches posts with pagination.

**Parameters:**
- `limit?: number` - Number of posts to fetch (default: 50)
- `offset?: number` - Number of posts to skip (default: 0)

**Returns:** `Promise<Post[]>`

**Throws:**
- Error if database operation fails

### userService.ts

#### `getCurrentUser()`
Gets the current authenticated user's profile.

**Returns:** `Promise<User | null>`

**Throws:**
- Error if database operation fails

## Component Props

### CreatePost
```typescript
interface CreatePostProps {
  currentUser: User;
  onPost?: (post: Post) => void;
}
```

### PostCard
```typescript
interface PostCardProps {
  post: Post;
  currentUser: User;
  onLike: (id: string) => void;
  onReply: (postId: string, content: string) => void;
}
```

## Type Definitions

### Post
```typescript
interface Post {
  id: string;
  user_id: string;
  user: User;
  content: string;
  images: string[];
  likes_count: number;
  comments_count: number;
  reracks_count: number;
  created_at: string;
  is_rerack: boolean;
  original_post?: Post;
  quote_text?: string;
  is_liked_by_current_user?: boolean;
}
```

### User
```typescript
interface User {
  id: string;
  handle: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  rank: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}
```

## Common Patterns

### Loading State
```typescript
const [loading, setLoading] = useState(true);
const [data, setData] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await getData();
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  fetchData();
}, []);

if (loading) return <LoadingSpinner />;
```

### Error Handling
```typescript
const [error, setError] = useState<string | null>(null);

try {
  await someOperation();
  setError(null);
} catch (err) {
  setError(err instanceof Error ? err.message : 'An error occurred');
}

{error && <div className="text-red-500">{error}</div>}
```

### Optimistic Updates
```typescript
const handleLike = async (postId: string) => {
  // Optimistically update UI
  setPosts(posts.map(p => 
    p.id === postId 
      ? { ...p, likes_count: p.likes_count + 1 }
      : p
  ));
  
  try {
    await likePost(postId, currentUser.id);
  } catch (error) {
    // Revert on error
    setPosts(posts.map(p => 
      p.id === postId 
        ? { ...p, likes_count: p.likes_count - 1 }
        : p
    ));
  }
};
```

## Troubleshooting

### Posts not loading
1. Check if migrations are applied
2. Verify Supabase connection in `.env.local`
3. Check browser console for errors
4. Verify RLS policies allow reading posts

### Can't create posts
1. Ensure user is authenticated
2. Check if user profile exists in database
3. Verify RLS policies allow inserting posts
4. Check content length (max 280 chars)

### Images not displaying
1. Verify image URLs are valid
2. Check if `post_images` table has records
3. Ensure images are publicly accessible
4. Check browser console for CORS errors

### Timestamps showing wrong time
1. Verify database timestamps are in UTC
2. Check browser timezone settings
3. Ensure `formatRelativeTime()` is imported correctly

## Performance Tips

1. **Pagination**: Always use limit/offset to avoid loading too many posts
2. **Image Optimization**: Compress images before upload
3. **Caching**: Consider caching user profiles to reduce queries
4. **Real-time**: Use Supabase subscriptions for live updates
5. **Lazy Loading**: Implement infinite scroll instead of loading all posts

## Security Notes

- ✅ RLS policies enforce user can only modify their own content
- ✅ Content length validated on both client and server
- ✅ Authentication required for creating posts
- ✅ Image URLs validated before storage
- ⚠️ TODO: Rate limiting for post creation
- ⚠️ TODO: Content moderation for inappropriate content
