import SocialLayout, { useSocialLayout } from '../Layout/SocialLayout';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import PostCard from '../Social/PostCard';
import CreatePost from '../Social/CreatePost';
import SearchBar from '../SearchBar';
import { Post } from '../../types';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { getPosts, subscribeToNewPosts, subscribeToLikes, subscribeToReRacks, subscribeToComments, likePost, unlikePost, createReRack, deletePost, createComment } from '../../services/postService';
import SkeletonPost from '../Loaders/SkeletonPost';
import { useToast } from '../../contexts/ToastContext';
import { getAvatarUrl } from '../../utils/userUtils';
import Avatar from '../Shared/Avatar';
import GistDiscovery from '../Gist/GistDiscovery';

const POSTS_PER_PAGE = 20;

const SocialFeedContent: React.FC<{
  currentUser: any;
  posts: Post[];
  isLoadingPosts: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  feedType: 'for-you' | 'following';
  setFeedType: (type: 'for-you' | 'following') => void;
  observerTarget: React.RefObject<HTMLDivElement>;
  onCreatePost: (post: Post) => void;
  onLike: (postId: string, isCurrentlyLiked: boolean) => void;
  onReply: (postId: string, content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'gif') => void;
  onReRack: (postId: string, type: 'simple' | 'quote', quoteText?: string) => void;
  onDelete: (postId: string) => void;
}> = ({
  currentUser,
  posts,
  isLoadingPosts,
  isLoadingMore,
  hasMore,
  error,
  feedType,
  setFeedType,
  observerTarget,
  onCreatePost,
  onLike,
  onReply,
  onReRack,
  onDelete
}) => {
    const { openDrawer } = useSocialLayout();
    const navigate = useNavigate();



    // Show loading state
    if (isLoadingPosts) {
      return (
        <div>
          {/* Render 5 skeletons */}
          {[...Array(5)].map((_, i) => (
            <SkeletonPost key={i} />
          ))}
        </div>
      );
    }

    // Show error state
    if (error) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Icon icon="ph:warning-circle" width="48" height="48" className="text-red-500 mx-auto mb-4" />
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-nsp-teal text-white rounded-full hover:bg-nsp-dark-teal transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Sticky Header with Tabs */}
        {/* Sticky Header with Tabs */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all duration-200">
          <div className="px-4 py-3 flex items-center gap-4 md:hidden">
            {/* Mobile Drawer Trigger */}
            <button onClick={(e) => { e.stopPropagation(); openDrawer(); }}>
              <Avatar user={currentUser} alt="Me" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
            </button>
            <div className="flex-1 flex justify-center items-center">
              <img src="/nsp_feed_logo.png" alt="NSP" className="h-10 w-auto object-contain" />
            </div>
            {/* Mobile Top Settings/Sparkle */}
            <button onClick={() => navigate('/settings')} className="text-gray-900 p-2 -mr-2 active:opacity-50 transition-opacity">
              <Icon icon="ph:gear-six" width="20" height="20" />
            </button>
          </div>

          {/* Usage of Tabs */}
          <div className="flex w-full">
            <button
              onClick={() => setFeedType('for-you')}
              className="flex-1 hover:bg-black/[0.03] transition-colors relative h-[53px]"
            >
              <div className="flex justify-center h-full items-center">
                <div className="relative h-full flex items-center">
                  <span className={`font-bold text-[15px] ${feedType === 'for-you' ? 'text-gray-900' : 'text-gray-500'}`}>
                    For You
                  </span>
                  {feedType === 'for-you' && (
                    <div className="absolute 0 left-0 right-0 h-[4px] bg-nsp-teal rounded-full bottom-0"></div>
                  )}
                </div>
              </div>
            </button>
            <button
              onClick={() => setFeedType('following')}
              className="flex-1 hover:bg-black/[0.03] transition-colors relative h-[53px]"
            >
              <div className="flex justify-center h-full items-center">
                <div className="relative h-full flex items-center">
                  <span className={`font-bold text-[15px] ${feedType === 'following' ? 'text-gray-900' : 'text-gray-500'}`}>
                    Following
                  </span>
                  {feedType === 'following' && (
                    <div className="absolute 0 left-0 right-0 h-[4px] bg-nsp-teal rounded-full bottom-0"></div>
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Gist Discovery Bar (Spaces Style) */}
        <GistDiscovery variant="horizontal" />

        {/* Create Post */}
        <div className="border-b border-gray-100 px-4 py-3 hidden md:block">
          <CreatePost currentUser={currentUser} onPost={onCreatePost} />
        </div>



        {/* Posts Stream */}
        <div>
          {posts.length === 0 && !isLoadingPosts ? (
            <div className="p-8 text-center text-gray-500">
              <Icon icon="ph:chat-circle-dots" width="64" height="64" className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No posts yet</p>
              <p className="text-sm">Be the first to share something!</p>
            </div>
          ) : (
            <>
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onLike={onLike}
                  onReply={onReply}
                  onReRack={onReRack}
                  onDelete={onDelete}
                />
              ))}

              {/* Infinite scroll loading indicator */}
              {hasMore && (
                <div ref={observerTarget} className="p-8 text-center">
                  {isLoadingMore && (
                    <div className="flex flex-col items-center gap-2">
                      <Icon
                        icon="line-md:loading-twotone-loop"
                        width="32"
                        height="32"
                        className="text-nsp-teal"
                      />
                      <p className="text-sm text-gray-500">Loading more posts...</p>
                    </div>
                  )}
                </div>
              )}

              {/* End of feed indicator */}
              {!hasMore && posts.length > 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">
                  <Icon icon="ph:check-circle" width="24" height="24" className="mx-auto mb-2" />
                  <p>You're all caught up!</p>
                </div>
              )}
            </>
          )}
        </div>
      </>
    );
  };

const SocialFeed: React.FC = () => {
  const navigate = useNavigate();
  const { profile: currentUser, loading: userLoading } = useCurrentUser();
  const { addToast } = useToast();
  const [feedType, setFeedType] = useState<'for-you' | 'following'>('for-you');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch initial posts from Supabase
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoadingPosts(true);
        // Reset posts when switching feeds
        setPosts([]);

        const fetchedPosts = await getPosts(POSTS_PER_PAGE, 0, currentUser?.id, feedType);
        setPosts(fetchedPosts);
        setOffset(POSTS_PER_PAGE);
        setHasMore(fetchedPosts.length === POSTS_PER_PAGE);
        setError(null);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts');
      } finally {
        setIsLoadingPosts(false);
      }
    };

    if (currentUser) {
      fetchPosts();
    }
  }, [currentUser, feedType]); // Re-run when feedType changes

  // Subscribe to real-time post updates
  useEffect(() => {
    const unsubscribe = subscribeToNewPosts(
      (newPost) => {
        setPosts((prevPosts) => {
          const exists = prevPosts.some(p => p.id === newPost.id);
          if (exists) return prevPosts;
          return [newPost, ...prevPosts];
        });
      },
      (error) => {
        console.error('Real-time subscription error:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time like updates
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToLikes(
      (postId, userId, isLike) => {
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post.id === postId) {
              return {
                ...post,
                likes_count: isLike ? post.likes_count + 1 : post.likes_count - 1,
                is_liked_by_current_user: userId === currentUser.id ? isLike : post.is_liked_by_current_user
              };
            }
            return post;
          })
        );
      },
      (error) => console.error(error)
    );
    return () => unsubscribe();
  }, [currentUser]);

  // Subscribe to real-time re-rack updates
  useEffect(() => {
    const unsubscribe = subscribeToReRacks(
      (originalPostId) => {
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post.id === originalPostId) {
              return {
                ...post,
                reracks_count: post.reracks_count + 1
              };
            }
            return post;
          })
        );
      },
      (error) => console.error(error)
    );
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time comment updates
  useEffect(() => {
    const unsubscribe = subscribeToComments(
      (newComment) => {
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post.id === newComment.post_id) {
              return {
                ...post,
                comments_count: post.comments_count + 1
              };
            }
            return post;
          })
        );
      },
      (error) => console.error(error)
    );
    return () => unsubscribe();
  }, []);

  // Load more posts for infinite scroll
  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      const newPosts = await getPosts(POSTS_PER_PAGE, offset, currentUser?.id, feedType);

      // Prevent duplicate posts by filtering out any posts that already exist
      const existingPostIds = new Set(posts.map(p => p.id));
      const uniqueNewPosts = newPosts.filter(p => !existingPostIds.has(p.id));

      setPosts(prevPosts => [...prevPosts, ...uniqueNewPosts]);
      setOffset(prevOffset => prevOffset + POSTS_PER_PAGE);
      setHasMore(newPosts.length === POSTS_PER_PAGE);
    } catch (err) {
      console.error('Error loading more posts:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, offset, posts, currentUser, feedType]);

  // Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [hasMore, isLoadingMore, loadMorePosts]);

  const handleCreatePost = (newPost: Post) => {
    // Optimistic UI update - add post immediately
    setPosts((prevPosts) => {
      const exists = prevPosts.some(p => p.id === newPost.id);
      if (exists) return prevPosts;
      return [newPost, ...prevPosts];
    });
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;

    // Find the post to determine current like state
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isCurrentlyLiked = post.is_liked_by_current_user;

    // Optimistic UI update
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            likes_count: isCurrentlyLiked ? p.likes_count - 1 : p.likes_count + 1,
            is_liked_by_current_user: !isCurrentlyLiked
          };
        }
        return p;
      })
    );

    try {
      // Call the appropriate service method
      if (isCurrentlyLiked) {
        await unlikePost(postId, currentUser.id);
      } else {
        await likePost(postId, currentUser.id);
      }
    } catch (error) {
      console.error('Error toggling like:', error);

      // Rollback optimistic update on error
      setPosts((prevPosts) =>
        prevPosts.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              likes_count: isCurrentlyLiked ? p.likes_count + 1 : p.likes_count - 1,
              is_liked_by_current_user: isCurrentlyLiked
            };
          }
          return p;
        })
      );
    }
  };

  const handleReply = useCallback(async (postId: string, content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'gif') => {
    if (!currentUser) return;
    try {
      await createComment(postId, currentUser.id, content, undefined, mediaUrl, mediaType);
      addToast('success', 'Reply sent');

      // Optimistically update counts
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
      ));

    } catch (error) {
      console.error('Error in handleReply:', error);
      addToast('error', 'Failed to send reply');
    }
  }, [currentUser, addToast]);

  const handleReRack = useCallback(async (postId: string, type: 'simple' | 'quote', quoteText?: string) => {
    if (!currentUser) return;

    try {
      // Create the re-rack
      const rerackPost = await createReRack(postId, currentUser.id, quoteText);

      // Optimistic UI update - add re-rack to feed
      setPosts((prevPosts) => {
        const exists = prevPosts.some(p => p.id === rerackPost.id);
        if (exists) return prevPosts;

        // Also update the reracks_count of the original post
        const updatedPosts = prevPosts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              reracks_count: p.reracks_count + 1
            };
          }
          return p;
        });

        return [rerackPost, ...updatedPosts];
      });
    } catch (error) {
      console.error('Error creating re-rack:', error);
      throw error; // Re-throw to let the PostCard handle the error display
    }
  }, [currentUser]);

  const handleDelete = useCallback(async (postId: string) => {
    if (!currentUser) return;

    // Optimistic UI update
    setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));

    try {
      await deletePost(postId, currentUser.id);
      addToast('success', 'Post deleted');
    } catch (error) {
      console.error('Error deleting post:', error);
      // We'd need original posts to rollback perfectly, but re-fetching might be easier or accepting the glitch
      // For now, let's just toast error
      addToast('error', 'Failed to delete post');
      // In a real robust app, we'd undo the filter
    }
  }, [currentUser, addToast]);

  // Show auth required state (Layout handles this for sidebar but we might want to be explicit)
  if (!userLoading && !currentUser) {
    // You might want to redirect or show a dedicated landing page
    // But for now, SocialLayout might render empty sidebars, so we should allow it but show a message?
    // Actually SocialFeed is protected by ProtectedRoute, so this shouldn't happen.
    return null;
  }

  return (
    <SocialLayout>
      <SocialFeedContent
        currentUser={currentUser}
        posts={posts}
        isLoadingPosts={isLoadingPosts}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        error={error}
        feedType={feedType}
        setFeedType={setFeedType}
        observerTarget={observerTarget}
        onCreatePost={handleCreatePost}
        onLike={handleLike}
        onReply={handleReply}
        onReRack={handleReRack}
        onDelete={handleDelete}
      />
    </SocialLayout>
  );
};

export default SocialFeed;