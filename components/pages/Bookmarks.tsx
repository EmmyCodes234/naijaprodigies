import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import SocialLayout from '../Layout/SocialLayout';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { getSavedPosts, likePost, unlikePost, createComment, createReRack, deletePost } from '../../services/postService';
import { Post } from '../../types';
import PostCard from '../Social/PostCard';
import { Link } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';

const Bookmarks: React.FC = () => {
    const { profile: currentUser } = useCurrentUser();
    const { addToast } = useToast();
    const [savedPosts, setSavedPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSavedPosts = async () => {
        if (!currentUser) return;

        try {
            setIsLoading(true);
            const posts = await getSavedPosts(currentUser.id);
            setSavedPosts(posts);
        } catch (error) {
            console.error('Error fetching saved posts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSavedPosts();
    }, [currentUser]);

    const handleLike = async (postId: string) => {
        if (!currentUser) return;

        // Optimistic update
        setSavedPosts(prevPosts =>
            prevPosts.map(post => {
                if (post.id === postId) {
                    const isLiked = post.is_liked_by_current_user;
                    return {
                        ...post,
                        is_liked_by_current_user: !isLiked,
                        likes_count: post.likes_count + (isLiked ? -1 : 1)
                    };
                }
                return post;
            })
        );

        try {
            const post = savedPosts.find(p => p.id === postId);
            if (post?.is_liked_by_current_user) {
                await unlikePost(postId, currentUser.id);
            } else {
                await likePost(postId, currentUser.id);
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            fetchSavedPosts(); // Revert on error
            addToast('error', 'Failed to update like');
        }
    };

    const handleReply = async (postId: string, content: string) => {
        if (!currentUser) return;
        try {
            await createComment(postId, currentUser.id, content);
            addToast('success', 'Reply sent');
            fetchSavedPosts(); // Refresh to show updated comment count
        } catch (error) {
            console.error('Error replying:', error);
            addToast('error', 'Failed to send reply');
        }
    };

    const handleReRack = async (postId: string, type: 'simple' | 'quote', quoteText?: string) => {
        if (!currentUser) return;
        try {
            await createReRack(postId, currentUser.id, quoteText);
            addToast('success', 'Post Re-Racked!');
            fetchSavedPosts();
        } catch (error) {
            console.error('Error re-racking:', error);
            addToast('error', 'Failed to re-rack post');
        }
    };

    const handleDelete = async (postId: string) => {
        if (!currentUser) return;
        try {
            await deletePost(postId, currentUser.id);
            setSavedPosts(prev => prev.filter(p => p.id !== postId));
            addToast('success', 'Post deleted');
        } catch (error) {
            console.error('Error deleting post:', error);
            addToast('error', 'Failed to delete post');
        }
    };

    return (
        <SocialLayout>
            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3">
                <div className="flex items-center gap-3">
                    <Link to="/feed" className="md:hidden">
                        <Icon icon="ph:arrow-left-bold" className="text-gray-700" width="20" height="20" />
                    </Link>
                    <div>
                        <h2 className="font-bold text-xl text-gray-900">Bookmarks</h2>
                        <p className="text-xs text-gray-500">@{currentUser?.handle}</p>
                    </div>
                </div>
            </div>

            <div className="pb-20">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Icon icon="line-md:loading-twotone-loop" width="48" height="48" className="text-nsp-teal" />
                    </div>
                ) : savedPosts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Icon icon="ph:bookmark-simple" width="32" height="32" className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Save posts for later</h3>
                        <p className="text-gray-500 max-w-sm mb-6">
                            Bookmark posts to easily find them again in the future. No one else can see your bookmarks.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {savedPosts.map(post => (
                            currentUser && <PostCard
                                key={post.id}
                                post={post}
                                currentUser={currentUser}
                                onLike={() => handleLike(post.id)}
                                onReply={handleReply}
                                onReRack={handleReRack}
                                onDelete={handleDelete}
                                onPostUpdated={() => {
                                    // If post unsaved, remove from list
                                    if (post.is_saved_by_current_user) {
                                        // Wait, if we unsave, is_saved becomes false.
                                        // But we are in Bookmarks, so we should probably fetch or filter.
                                        fetchSavedPosts();
                                    }
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </SocialLayout>
    );
};

export default Bookmarks;
