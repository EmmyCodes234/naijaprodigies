import SocialLayout, { useSocialLayout } from '../Layout/SocialLayout';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import PostCard from '../Social/PostCard';
import CreatePost from '../Social/CreatePost';
import { Post } from '../../types';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { getPosts, subscribeToNewPosts, subscribeToLikes, subscribeToReRacks, subscribeToComments, likePost, unlikePost, createReRack, deletePost, createComment } from '../../services/postService';
import SkeletonPost from '../Loaders/SkeletonPost';
import { useToast } from '../../contexts/ToastContext';
import Avatar from '../Shared/Avatar';
import GistDiscovery from '../Gist/GistDiscovery';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const POSTS_PER_PAGE = 20;

const SocialFeedContent: React.FC<{
  currentUser: any;
  posts: Post[];
  isLoadingPosts: boolean;
  isFetching: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: any;
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
  isFetching,
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

    // Show loading state (initial load only)
    if ((isLoadingPosts || isFetching) && posts.length === 0) {
      return (
        <div>
          {[...Array(5)].map((_, i) => (
            <SkeletonPost key={i} />
          ))}
        </div>
      );
    }

    // Show error state
    if (error && posts.length === 0) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Icon icon="ph:warning-circle" width="48" height="48" className="text-red-500 mx-auto mb-4" />
            <p className="text-red-500 mb-4">
              {error instanceof Error ? error.message : 'Failed to load posts'}
            </p>
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
          {posts.length === 0 && !isLoadingPosts && !isFetching ? (
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
  const { profile: currentUser, loading: userLoading } = useCurrentUser();
  const { addToast } = useToast();
  const [feedType, setFeedType] = useState<'for-you' | 'following'>('for-you');
  const queryClient = useQueryClient();
  const observerTarget = useRef<HTMLDivElement>(null);

  // React Query: Infinite Posts Fetch
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    error,
  } = useInfiniteQuery({
    queryKey: ['posts', feedType, currentUser?.id],
    queryFn: ({ pageParam = 0 }) => getPosts(POSTS_PER_PAGE, pageParam, currentUser?.id, feedType),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // If the last page has fewer items than requested, we've reached the end
      if (lastPage.length < POSTS_PER_PAGE) return undefined;
      // Next offset is the total number of items loaded so far
      return allPages.flat().length;
    },
    enabled: !!currentUser, // Only fetch when user is loaded
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  // Flatten pages into a single array of posts
  const posts = data?.pages.flat() || [];

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Realtime Subscriptions (Updates Cache Directly)
  useEffect(() => {
    if (!currentUser) return;

    // Helper to update posts in cache
    const updateCache = (updater: (oldPosts: Post[]) => Post[]) => {
      queryClient.setQueryData(['posts', feedType, currentUser.id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: Post[], index: number) => {
            if (index === 0) {
              // For new posts, we only might add to the first page.
              // But the updater function logic here is simplifying assuming flat array.
              // Infinite query structure is complex (pages array).
              // We will map over all pages.
              return updater(page); // This logic needs to be careful not to duplicate or mess order.
            }
            return updater(page);
          }),
        };
      });
      // A safer approach for list updates is usually to invalidate, but that causes refetch.
      // For mutations like 'like', we can iterate all pages.
    };

    const unsubscribeNewPosts = subscribeToNewPosts(
      (newPost) => {
        queryClient.setQueryData(['posts', feedType, currentUser.id], (oldData: any) => {
          if (!oldData) return { pages: [[newPost]], pageParams: [0] };
          const firstPage = oldData.pages[0];
          // Check if exists
          if (firstPage.some((p: Post) => p.id === newPost.id)) return oldData;

          // Prepend to first page
          const newFirstPage = [newPost, ...firstPage];
          return {
            ...oldData,
            pages: [newFirstPage, ...oldData.pages.slice(1)]
          };
        });
      },
      (err) => console.error(err)
    );

    const unsubscribeLikes = subscribeToLikes(
      (postId, userId, isLike) => {
        queryClient.setQueryData(['posts', feedType, currentUser.id], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: Post[]) =>
              page.map(post => {
                if (post.id === postId) {
                  return {
                    ...post,
                    likes_count: isLike ? post.likes_count + 1 : post.likes_count - 1,
                    is_liked_by_current_user: userId === currentUser.id ? isLike : post.is_liked_by_current_user
                  };
                }
                return post;
              })
            )
          };
        });
      },
      (err) => console.error(err)
    );

    const unsubscribeComments = subscribeToComments(
      (newComment) => {
        queryClient.setQueryData(['posts', feedType, currentUser.id], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: Post[]) =>
              page.map(post => {
                if (post.id === newComment.post_id) {
                  return { ...post, comments_count: post.comments_count + 1 };
                }
                return post;
              })
            )
          };
        });
      },
      (err) => console.error(err)
    );

    const unsubscribeReRacks = subscribeToReRacks(
      (originalPostId) => {
        queryClient.setQueryData(['posts', feedType, currentUser.id], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: Post[]) =>
              page.map(post => {
                if (post.id === originalPostId) {
                  return { ...post, reracks_count: post.reracks_count + 1 };
                }
                return post;
              })
            )
          };
        });
      },
      (err) => console.error(err)
    );

    return () => {
      unsubscribeNewPosts();
      unsubscribeLikes();
      unsubscribeComments();
      unsubscribeReRacks();
    };
  }, [currentUser, queryClient, feedType]);


  // Mutations
  const createPostMutation = useMutation({
    mutationFn: (post: Post) => Promise.resolve(post), // The act of creating is handled in CreatePost component, here we just receive the result
    onSuccess: (newPost) => {
      // Manually update cache if subscription is slow, or handled by subscription?
      // Let's rely on manual update for instant feel, deduplicated by subscription logic
      queryClient.setQueryData(['posts', feedType, currentUser?.id], (oldData: any) => {
        if (!oldData) return { pages: [[newPost]], pageParams: [0] };
        const firstPage = oldData.pages[0];
        if (firstPage.some((p: Post) => p.id === newPost.id)) return oldData;
        return {
          ...oldData,
          pages: [[newPost, ...firstPage], ...oldData.pages.slice(1)]
        };
      });
    }
  });

  const likeMutation = useMutation({
    mutationFn: async ({ postId, isCurrentlyLiked }: { postId: string, isCurrentlyLiked: boolean }) => {
      if (!currentUser) throw new Error("No user");
      if (isCurrentlyLiked) {
        await unlikePost(postId, currentUser.id);
      } else {
        await likePost(postId, currentUser.id);
      }
    },
    onMutate: async ({ postId, isCurrentlyLiked }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['posts', feedType, currentUser?.id] });
      const previousData = queryClient.getQueryData(['posts', feedType, currentUser?.id]);

      // Optimistically update
      queryClient.setQueryData(['posts', feedType, currentUser?.id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: Post[]) =>
            page.map(post => {
              if (post.id === postId) {
                return {
                  ...post,
                  likes_count: isCurrentlyLiked ? post.likes_count - 1 : post.likes_count + 1,
                  is_liked_by_current_user: !isCurrentlyLiked
                };
              }
              return post;
            })
          )
        };
      });

      return { previousData };
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(['posts', feedType, currentUser?.id], context?.previousData);
      addToast('error', 'Failed to update like');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!currentUser) throw new Error("No user");
      await deletePost(postId, currentUser.id);
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['posts', feedType, currentUser?.id] });
      const previousData = queryClient.getQueryData(['posts', feedType, currentUser?.id]);

      queryClient.setQueryData(['posts', feedType, currentUser?.id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: Post[]) => page.filter(p => p.id !== postId))
        };
      });
      return { previousData };
    },
    onError: (err, postId, context) => {
      queryClient.setQueryData(['posts', feedType, currentUser?.id], context?.previousData);
      addToast('error', 'Failed to delete post');
    },
    onSuccess: () => {
      addToast('success', 'Post deleted');
    }
  });

  // Handlers
  const handleCreatePost = (post: Post) => {
    createPostMutation.mutate(post);
  };

  const handleLike = (postId: string, isCurrentlyLiked: boolean) => {
    likeMutation.mutate({ postId, isCurrentlyLiked });
  };

  const handleDelete = (postId: string) => {
    deleteMutation.mutate(postId);
  };

  // Reply and ReRack (simplified for now, using legacy pattern or could move to mutation)
  // Keeping standard callback pattern but ensuring it invalidates or manually updates could help
  const handleReply = useCallback(async (postId: string, content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'gif') => {
    if (!currentUser) return;
    try {
      await createComment(postId, currentUser.id, content, undefined, mediaUrl, mediaType);
      addToast('success', 'Reply sent');
      // Optimistic update via subscription or manual?
      // Subscription handles it usually, but let's do manual for speed
      /* Logic handled by subscription listener above */
    } catch (error) {
      console.error(error);
      addToast('error', 'Failed to send reply');
    }
  }, [currentUser, addToast]);

  const handleReRack = useCallback(async (postId: string, type: 'simple' | 'quote', quoteText?: string) => {
    if (!currentUser) return;
    try {
      const rerack = await createReRack(postId, currentUser.id, quoteText);
      // Add to feed
      handleCreatePost(rerack);
    } catch (error) {
      console.error(error);
      addToast('error', 'Failed to repost');
    }
  }, [currentUser, handleCreatePost]);


  if (!userLoading && !currentUser) return null;

  return (
    <SocialLayout>
      <SocialFeedContent
        currentUser={currentUser}
        posts={posts}
        isLoadingPosts={isLoading || userLoading}
        isFetching={isFetching}
        isLoadingMore={isFetchingNextPage}
        hasMore={hasNextPage}
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