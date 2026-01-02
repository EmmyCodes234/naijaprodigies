import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import SocialLayout, { useSocialLayout } from '../Layout/SocialLayout';
import PostCard from '../Social/PostCard';
import CommentThread from '../Social/CommentThread';
import CreatePost from '../Social/CreatePost';
import { Post, Comment } from '../../types';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { getPostById, getComments, likePost, unlikePost, createReRack } from '../../services/postService';

const PostDetailContent: React.FC<{
    currentUser: any;
    post: Post | null;
    comments: Comment[];
    isLoading: boolean;
    error: string | null;
    onLike: (postId: string) => void;
    onReply: (postId: string, content: string) => void;
    onReRack: (postId: string, type: 'simple' | 'quote', quoteText?: string) => void;
    onCommentReply: (commentId: string, content: string) => void;
}> = ({
    currentUser,
    post,
    comments,
    isLoading,
    error,
    onLike,
    onReply,
    onReRack,
    onCommentReply
}) => {
        const navigate = useNavigate();
        const { openDrawer } = useSocialLayout();

        if (isLoading) {
            return (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <Icon icon="line-md:loading-twotone-loop" width="48" height="48" className="text-nsp-teal mx-auto mb-4" />
                        <p className="text-gray-500">Loading post...</p>
                    </div>
                </div>
            );
        }

        if (error || !post) {
            return (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <Icon icon="ph:warning-circle" width="48" height="48" className="text-red-500 mx-auto mb-4" />
                        <p className="text-red-500 mb-4">{error || 'Post not found'}</p>
                        <button
                            onClick={() => navigate(-1)}
                            className="px-6 py-2 bg-nsp-teal text-white rounded-full hover:bg-nsp-dark-teal transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <>
                {/* Sticky Header */}
                <div className="sticky top-[60px] md:top-[72px] z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-4">
                    <div onClick={(e) => { e.stopPropagation(); navigate(-1); }} className="cursor-pointer p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                        <Icon icon="ph:arrow-left-bold" width="20" height="20" className="text-gray-900" />
                    </div>
                    <h2 className="font-bold text-xl text-gray-900">Post</h2>

                    {/* Spacer */}
                    <div className="flex-1"></div>

                    {/* Mobile Drawer Trigger (Right aligned on mobile if we want, but sticking to Left usually. Here we have Back button)
              Actually, on a Detail page, usually you don't show the Drawer trigger in the header, you show Back.
              So we removed the drawer trigger from here.
          */}
                </div>

                {/* Main Post */}
                <div>
                    <PostCard
                        post={post}
                        currentUser={currentUser}
                        onLike={onLike}
                        onReply={onReply}
                        onReRack={onReRack}
                        isDetailView={true} // We might want to add this prop to PostCard to style it slightly differently (larger text etc)
                    />
                </div>

                {/* Reply Input Area */}
                <div className="border-b border-gray-100 px-4 py-3">
                    <div className="flex gap-3">
                        <img src={currentUser?.avatar || '/default-avatar.png'} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex-1">
                            <p className="text-gray-500 pt-2">Reply to @{post.user.handle}...</p>
                            {/* We can reuse CreatePost or a simplified version here */}
                        </div>
                    </div>
                </div>

                {/* Comments */}
                <div className="pb-20">
                    <CommentThread
                        comments={comments}
                        currentUser={currentUser}
                        onReply={onCommentReply}
                    />
                </div>
            </>
        )
    }

const PostDetail: React.FC = () => {
    const { postId } = useParams<{ postId: string }>();
    const { profile: currentUser, loading: userLoading } = useCurrentUser();
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPostAndComments = async () => {
            if (!postId) return;
            try {
                setIsLoading(true);
                const [fetchedPost, fetchedComments] = await Promise.all([
                    getPostById(postId, currentUser?.id),
                    getComments(postId)
                ]);
                setPost(fetchedPost);
                setComments(fetchedComments);
            } catch (err: any) {
                console.error('Error fetching post details:', err);
                setError(err.message || 'Failed to load post');
            } finally {
                setIsLoading(false);
            }
        };

        if (currentUser || !userLoading) { // Fetch even if not logged in? Ideally yes but we need currentUser for like status
            if (!userLoading) {
                fetchPostAndComments();
            }
        }
    }, [postId, currentUser, userLoading]);

    const handleLike = async (id: string) => {
        if (!currentUser || !post) return;

        const isCurrentlyLiked = post.is_liked_by_current_user;

        // Optimistic update
        setPost(prev => prev ? ({
            ...prev,
            likes_count: isCurrentlyLiked ? prev.likes_count - 1 : prev.likes_count + 1,
            is_liked_by_current_user: !isCurrentlyLiked
        }) : null);

        try {
            if (isCurrentlyLiked) await unlikePost(id, currentUser.id);
            else await likePost(id, currentUser.id);
        } catch (err) {
            console.error('Error toggling like:', err);
            // Rollback
            setPost(prev => prev ? ({
                ...prev,
                likes_count: isCurrentlyLiked ? prev.likes_count + 1 : prev.likes_count - 1,
                is_liked_by_current_user: isCurrentlyLiked
            }) : null);
        }
    };

    const handleReply = (id: string, content: string) => {
        console.log('Reply to post', id, content);
        // Implement actual reply logic
    };

    const handleReRack = async (id: string, type: 'simple' | 'quote', quoteText?: string) => {
        if (!currentUser) return;
        try {
            await createReRack(id, currentUser.id, quoteText);
            setPost(prev => prev ? ({ ...prev, reracks_count: prev.reracks_count + 1 }) : null);
        } catch (err) {
            console.error('Error reracking:', err);
        }
    };

    const handleCommentReply = (commentId: string, content: string) => {
        console.log('Reply to comment', commentId, content);
        // Implement comment reply logic
    };

    if (!userLoading && !currentUser) return null; // Or unauthorized view

    return (
        <SocialLayout>
            <PostDetailContent
                currentUser={currentUser}
                post={post}
                comments={comments}
                isLoading={isLoading}
                error={error}
                onLike={handleLike}
                onReply={handleReply}
                onReRack={handleReRack}
                onCommentReply={handleCommentReply}
            />
        </SocialLayout>
    );
};

export default PostDetail;
