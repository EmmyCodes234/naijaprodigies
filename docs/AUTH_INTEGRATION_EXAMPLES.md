# Authentication Integration Examples

This guide shows how to integrate authentication with existing components.

## Example 1: Using Auth in Social Feed

```tsx
// components/pages/SocialFeed.tsx
import React from 'react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import CreatePost from '../Social/CreatePost';

const SocialFeed: React.FC = () => {
  const { profile, loading, error } = useCurrentUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-nsp-orange text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error loading profile</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Social Feed</h1>
      
      {/* Pass the authenticated user's profile to CreatePost */}
      <CreatePost 
        currentUser={profile}
        onPost={(post) => {
          console.log('New post created:', post);
          // Refresh feed or add post to state
        }}
      />
      
      {/* Rest of feed content */}
    </div>
  );
};

export default SocialFeed;
```

## Example 2: Conditional Rendering Based on Auth

```tsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const MyComponent: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      {user ? (
        <div>
          <h2>Welcome back!</h2>
          <p>You are logged in as {user.email}</p>
        </div>
      ) : (
        <div>
          <h2>Welcome, Guest!</h2>
          <p>Please sign in to access all features</p>
        </div>
      )}
    </div>
  );
};
```

## Example 3: Like Button with Auth Check

```tsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { likePost } from '../services/postService';

interface LikeButtonProps {
  postId: string;
  isLiked: boolean;
  likesCount: number;
}

const LikeButton: React.FC<LikeButtonProps> = ({ postId, isLiked, likesCount }) => {
  const { user } = useAuth();
  const { profile } = useCurrentUser();
  const [liked, setLiked] = React.useState(isLiked);
  const [count, setCount] = React.useState(likesCount);

  const handleLike = async () => {
    if (!user || !profile) {
      alert('Please sign in to like posts');
      return;
    }

    try {
      if (liked) {
        // Unlike logic
        await unlikePost(postId, profile.id);
        setLiked(false);
        setCount(count - 1);
      } else {
        // Like logic
        await likePost(postId, profile.id);
        setLiked(true);
        setCount(count + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <button
      onClick={handleLike}
      className={`flex items-center gap-2 ${liked ? 'text-red-500' : 'text-gray-500'}`}
    >
      <Icon icon={liked ? 'ph:heart-fill' : 'ph:heart'} width="20" height="20" />
      <span>{count}</span>
    </button>
  );
};
```

## Example 4: Comment Form with Auth

```tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { createComment } from '../services/postService';

interface CommentFormProps {
  postId: string;
  onCommentAdded?: () => void;
}

const CommentForm: React.FC<CommentFormProps> = ({ postId, onCommentAdded }) => {
  const { user } = useAuth();
  const { profile } = useCurrentUser();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user || !profile) {
    return (
      <div className="text-gray-500 text-sm">
        Please sign in to comment
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await createComment(postId, profile.id, content);
      setContent('');
      onCommentAdded?.();
    } catch (error) {
      console.error('Error creating comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <img
        src={profile.avatar || '/default-avatar.png'}
        alt={profile.name}
        className="w-8 h-8 rounded-full"
      />
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment..."
        className="flex-1 px-4 py-2 border rounded-full"
        disabled={isSubmitting}
      />
      <button
        type="submit"
        disabled={!content.trim() || isSubmitting}
        className="px-4 py-2 bg-nsp-orange text-white rounded-full disabled:opacity-50"
      >
        {isSubmitting ? 'Posting...' : 'Post'}
      </button>
    </form>
  );
};
```

## Example 5: Follow Button with Auth

```tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { followUser, unfollowUser } from '../services/followService';

interface FollowButtonProps {
  targetUserId: string;
  isFollowing: boolean;
}

const FollowButton: React.FC<FollowButtonProps> = ({ targetUserId, isFollowing: initialFollowing }) => {
  const { user } = useAuth();
  const { profile } = useCurrentUser();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);

  if (!user || !profile) {
    return null; // Don't show follow button if not logged in
  }

  if (profile.id === targetUserId) {
    return null; // Don't show follow button on own profile
  }

  const handleToggleFollow = async () => {
    setIsLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(profile.id, targetUserId);
        setIsFollowing(false);
      } else {
        await followUser(profile.id, targetUserId);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleFollow}
      disabled={isLoading}
      className={`px-4 py-2 rounded-full font-bold transition-colors ${
        isFollowing
          ? 'bg-transparent border-2 border-nsp-orange text-nsp-orange hover:bg-red-50'
          : 'bg-nsp-orange text-white hover:bg-orange-600'
      }`}
    >
      {isLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  );
};
```

## Example 6: Profile Edit Form (Only for Own Profile)

```tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { updateUserProfile } from '../services/userService';

interface ProfileEditFormProps {
  userId: string;
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ userId }) => {
  const { user } = useAuth();
  const { profile } = useCurrentUser();
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only show edit form if viewing own profile
  if (!user || !profile || profile.id !== userId) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateUserProfile(profile.id, { name, bio });
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
          rows={4}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="px-6 py-2 bg-nsp-orange text-white rounded-lg disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
};
```

## Example 7: Navbar User Menu

```tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Link } from 'react-router-dom';

const UserMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const { profile } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <img
          src={profile.avatar || '/default-avatar.png'}
          alt={profile.name}
          className="w-8 h-8 rounded-full"
        />
        <span className="font-medium">{profile.name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2">
          <Link
            to={`/profile/${profile.handle}`}
            className="block px-4 py-2 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            My Profile
          </Link>
          <Link
            to="/settings"
            className="block px-4 py-2 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            Settings
          </Link>
          <hr className="my-2" />
          <button
            onClick={() => {
              signOut();
              setIsOpen(false);
            }}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};
```

## Key Patterns

### 1. Always Check Auth State
```tsx
const { user } = useAuth();
if (!user) {
  // Show sign in prompt or redirect
  return <SignInPrompt />;
}
```

### 2. Get User Profile for Database Operations
```tsx
const { profile } = useCurrentUser();
if (!profile) {
  return <div>Loading profile...</div>;
}
// Use profile.id for database operations
```

### 3. Handle Loading States
```tsx
const { profile, loading, error } = useCurrentUser();

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (!profile) return <SignInPrompt />;

// Render component with profile
```

### 4. Protect Actions
```tsx
const handleAction = async () => {
  if (!user || !profile) {
    alert('Please sign in to perform this action');
    return;
  }
  
  // Perform action
};
```

## Testing Checklist

- [ ] Component renders correctly when not authenticated
- [ ] Component renders correctly when authenticated
- [ ] Loading states display properly
- [ ] Error states are handled gracefully
- [ ] Actions require authentication
- [ ] User can only modify their own content
- [ ] Sign out clears all user-specific state
