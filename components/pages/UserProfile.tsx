import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { User, Post } from '../../types';
import { getUserById, getUserPosts } from '../../services/userService';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import PostCard from '../Social/PostCard';
import { likePost, unlikePost, createComment, createReRack, deletePost } from '../../services/postService';
import { useToast } from '../../contexts/ToastContext';
import { getFollowerCount, getFollowingCount } from '../../services/followService';
import FollowListModal from '../FollowListModal';
import ProfileEditModal from '../ProfileEditModal';
import FollowButton from '../FollowButton';
import SkeletonProfileHeader from '../Loaders/SkeletonProfileHeader';
import SkeletonPost from '../Loaders/SkeletonPost';
import { getAvatarUrl } from '../../utils/userUtils';
import Avatar from '../Shared/Avatar';
import VerifiedBadge from '../Shared/VerifiedBadge';

type TabType = 'posts' | 'media' | 'liked';

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { profile: currentUser } = useCurrentUser();
  const { addToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');
  const [showEditModal, setShowEditModal] = useState(false);

  // Load user profile
  useEffect(() => {
    const loadUser = async () => {
      if (!userId) {
        setError('User ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userData = await getUserById(userId);
        setUser(userData);
        setError(null);

        // Load follower/following counts
        const [followers, following] = await Promise.all([
          getFollowerCount(userId),
          getFollowingCount(userId)
        ]);
        setFollowerCount(followers);
        setFollowingCount(following);
      } catch (err) {
        console.error('Failed to load user:', err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  // Load posts when user or tab changes
  useEffect(() => {
    const loadPosts = async () => {
      if (!userId) return;

      try {
        setLoadingPosts(true);
        const userPosts = await getUserPosts(userId, activeTab);
        setPosts(userPosts);
      } catch (err) {
        console.error('Failed to load posts:', err);
      } finally {
        setLoadingPosts(false);
      }
    };

    if (user) {
      loadPosts();
    }
  }, [userId, activeTab, user]);

  const handleLike = async (postId: string) => {
    if (!currentUser) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isLiked = post.is_liked_by_current_user;

    // Optimistic update
    setPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === postId
          ? {
            ...p,
            is_liked_by_current_user: !isLiked,
            likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1
          }
          : p
      )
    );

    try {
      if (isLiked) {
        await unlikePost(postId, currentUser.id);
      } else {
        await likePost(postId, currentUser.id);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Revert optimistic update
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p.id === postId
            ? {
              ...p,
              is_liked_by_current_user: isLiked,
              likes_count: isLiked ? p.likes_count + 1 : p.likes_count - 1
            }
            : p
        )
      );
    }
  };

  const handleReply = async (postId: string, content: string) => {
    if (!currentUser) return;
    try {
      await createComment(postId, currentUser.id, content);
      addToast('success', 'Reply sent');

      // Optimistic update for comment count
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
      ));
    } catch (err) {
      console.error('Failed to reply:', err);
      addToast('error', 'Failed to send reply');
    }
  };

  const handleReRack = async (postId: string, type: 'simple' | 'quote', quoteText?: string) => {
    if (!currentUser) return;
    try {
      await createReRack(postId, currentUser.id, quoteText);
      addToast('success', 'Post re-racked!');

      // Optimistic update
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, reracks_count: p.reracks_count + 1 } : p
      ));
    } catch (err) {
      console.error('Error reracking:', err);
      addToast('error', 'Failed to re-rack');
    }
  };

  const handleDelete = async (postId: string) => {
    if (!currentUser) return;

    // Optimistic remove
    const previousPosts = [...posts];
    setPosts(prev => prev.filter(p => p.id !== postId));

    try {
      await deletePost(postId, currentUser.id);
      addToast('success', 'Post deleted');
    } catch (err) {
      console.error('Failed to delete post:', err);
      setPosts(previousPosts);
      addToast('error', 'Failed to delete post');
    }
  };

  const handleFollowersClick = () => {
    setFollowModalType('followers');
    setShowFollowModal(true);
  };

  const handleFollowingClick = () => {
    setFollowModalType('following');
    setShowFollowModal(true);
  };

  const handleProfileUpdated = (updatedUser: User) => {
    // Optimistic update
    setUser(updatedUser);
  };

  const handleFollowChange = async (isFollowing: boolean) => {
    // Update follower count in real-time
    if (!userId) return;

    try {
      const newFollowerCount = await getFollowerCount(userId);
      setFollowerCount(newFollowerCount);
    } catch (error) {
      console.error('Failed to update follower count:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen pt-16">
        <SkeletonProfileHeader />
        <div className="max-w-2xl mx-auto px-4 mt-8 space-y-4">
          <SkeletonPost />
          <SkeletonPost />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-white min-h-screen pt-16">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center">
            <Icon icon="ph:user-circle-x" width="64" height="64" className="text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">User not found</h2>
            <p className="text-gray-600 mb-4">{error || 'The user you are looking for does not exist.'}</p>
            <button
              onClick={() => navigate('/feed')}
              className="bg-nsp-teal text-white px-6 py-2 rounded-full font-bold hover:bg-nsp-dark-teal transition-colors"
            >
              Back to Feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Header with back button */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-10">
          <div className="px-4 py-3 flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Icon icon="ph:arrow-left" width="20" height="20" className="text-gray-900" />
            </button>
            <div>
              <div className="flex items-center gap-1">
                <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
                <VerifiedBadge user={user} size={18} />
              </div>
              <p className="text-sm text-gray-500">{posts.length} posts</p>
            </div>
          </div>
        </div>

        {/* Profile Header */}
        <div className="border-b border-gray-200">
          {/* Cover Image */}
          <div className="h-48 w-full bg-gray-200">
            {user.cover_url ? (
              <img src={user.cover_url} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-nsp-teal to-nsp-dark-teal"></div>
            )}
          </div>

          {/* Profile Info */}
          <div className="px-4 pb-4">
            {/* Action Buttons (Top Right) */}
            <div className="flex justify-between items-start">
              {/* Avatar (Left) */}
              <div className="relative -mt-16 mb-4">
                <div className="relative inline-block">
                  <Avatar
                    user={user}
                    alt={user.name}
                    className="w-32 h-32 rounded-full border-4 border-white object-cover bg-white"
                  />
                  {user.rank === 'Grandmaster' && (
                    <div className="absolute bottom-2 right-2 bg-nsp-yellow text-nsp-dark-teal p-2 rounded-full border-2 border-white" title="Grandmaster">
                      <Icon icon="ph:crown-fill" width="20" height="20" />
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-4 flex gap-2">
                {currentUser?.id === user.id ? (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="px-4 py-2 border border-gray-300 rounded-full font-bold text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    Edit Profile
                  </button>
                ) : currentUser ? (
                  <>
                    <button
                      onClick={() => navigate(`/messages?user=${user.id}`)}
                      className="p-2 border border-gray-300 rounded-full font-bold text-gray-900 hover:bg-gray-50 transition-colors"
                      title="Send message"
                    >
                      <Icon icon="ph:envelope" width="20" height="20" />
                    </button>
                    <FollowButton
                      targetUserId={user.id}
                      currentUserId={currentUser.id}
                      onFollowChange={handleFollowChange}
                    />
                  </>
                ) : null}
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                <VerifiedBadge user={user} size={24} />
              </div>
              <p className="text-gray-500">@{user.handle}</p>
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="text-gray-900 mb-4 whitespace-pre-wrap">{user.bio}</p>
            )}

            {/* Metadata (Location, Website, Date joined) */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-gray-500 text-sm mb-4">
              {user.location && (
                <div className="flex items-center gap-1">
                  <Icon icon="ph:map-pin" width="18" height="18" />
                  <span>{user.location}</span>
                </div>
              )}
              {user.website && (
                <div className="flex items-center gap-1">
                  <Icon icon="ph:link" width="18" height="18" />
                  <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-nsp-teal hover:underline">{user.website.replace(/^https?:\/\//, '')}</a>
                </div>
              )}
              {user.birth_date && (
                <div className="flex items-center gap-1">
                  <Icon icon="ph:balloon" width="18" height="18" />
                  <span>Born {new Date(user.birth_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Icon icon="ph:calendar-blank" width="18" height="18" />
                <span>Joined {new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Rank Badge */}
            {user.rank && (
              <div className="mb-4">
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-nsp-orange/10 text-nsp-orange rounded-full text-sm font-bold">
                  <Icon icon="ph:trophy" width="16" height="16" />
                  {user.rank}
                </span>
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <button
                onClick={handleFollowingClick}
                className="hover:underline"
              >
                <span className="font-bold text-gray-900">{followingCount}</span>{' '}
                <span className="text-gray-500">Following</span>
              </button>
              <button
                onClick={handleFollowersClick}
                className="hover:underline"
              >
                <span className="font-bold text-gray-900">{followerCount}</span>{' '}
                <span className="text-gray-500">Followers</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 sticky top-[calc(4rem+57px)] bg-white z-10">
          <div className="flex">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-4 text-center font-bold transition-colors relative ${activeTab === 'posts'
                ? 'text-gray-900'
                : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
              Posts
              {activeTab === 'posts' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-nsp-teal rounded-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`flex-1 py-4 text-center font-bold transition-colors relative ${activeTab === 'media'
                ? 'text-gray-900'
                : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
              Media
              {activeTab === 'media' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-nsp-teal rounded-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('liked')}
              className={`flex-1 py-4 text-center font-bold transition-colors relative ${activeTab === 'liked'
                ? 'text-gray-900'
                : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
              Liked
              {activeTab === 'liked' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-nsp-teal rounded-full"></div>
              )}
            </button>
          </div>
        </div>

        {/* Posts Feed */}
        <div>
          {loadingPosts ? (
            <div className="flex justify-center items-center py-12">
              <Icon icon="line-md:loading-twotone-loop" width="32" height="32" className="text-nsp-teal" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Icon icon="ph:note-blank" width="64" height="64" className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {activeTab === 'posts' && 'No posts yet'}
                {activeTab === 'media' && 'No media posts'}
                {activeTab === 'liked' && 'No liked posts'}
              </h3>
              <p className="text-gray-500">
                {activeTab === 'posts' && currentUser?.id === user.id && 'Share your first post!'}
                {activeTab === 'posts' && currentUser?.id !== user.id && 'This user hasn\'t posted yet.'}
                {activeTab === 'media' && 'No posts with images or videos.'}
                {activeTab === 'liked' && 'No liked posts to show.'}
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser!}
                onLike={handleLike}
                onReply={handleReply}
                onReRack={handleReRack}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      {/* Follow List Modal */}
      {user && (
        <FollowListModal
          isOpen={showFollowModal}
          onClose={() => setShowFollowModal(false)}
          userId={user.id}
          type={followModalType}
          userName={user.name}
        />
      )}

      {/* Profile Edit Modal */}
      {user && (
        <ProfileEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          user={user}
          onProfileUpdated={handleProfileUpdated}
        />
      )}
    </div>
  );
};

export default UserProfile;
