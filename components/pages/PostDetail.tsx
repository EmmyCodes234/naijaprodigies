import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import SocialLayout, { useSocialLayout } from '../Layout/SocialLayout';
import PostCard from '../Social/PostCard';
import CommentThread from '../Social/CommentThread';
import CreatePost from '../Social/CreatePost';
import { Post, Comment } from '../../types';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useToast } from '../../contexts/ToastContext';
import SkeletonPost from '../Loaders/SkeletonPost';
import { getPostById, getComments, likePost, unlikePost, createReRack, createComment, deletePost } from '../../services/postService';
import { getAvatarUrl } from '../../utils/userUtils';

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
    onDelete: (postId: string) => void;
}> = ({
    currentUser,
    post,
    comments,
    isLoading,
    error,
    onLike,
    onReply,
    onReRack,
    onCommentReply,
    onDelete
}) => {
        const navigate = useNavigate();
        const { openDrawer } = useSocialLayout();

        if (isLoading) {
            return (
                <div className="bg-white min-h-screen pt-16 md:pt-[72px]">
                    <div className="max-w-2xl mx-auto">
                        <SkeletonPost />
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
                        onDelete={onDelete}
                        isDetailView={true} // We might want to add this prop to PostCard to style it slightly differently (larger text etc)
                    />
                </div>

                {/* Reply Input Area */}
                <div className="border-b border-gray-100 px-4 py-3">
                    <div className="flex gap-3">
                        <img src={getAvatarUrl(currentUser)} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex-1">
                            <textarea
                                className="w-full bg-transparent text-lg placeholder-gray-500 focus:outline-none resize-none"
                                placeholder={`Reply to @${post.user.handle || 'user'}...`}
                                rows={2}
                                id="post-detail-reply-input"
                            />
                            <div className="flex justify-between items-center mt-2">
                                <div className="flex text-nsp-teal gap-2">
                                    <Icon icon="ph:image" width="24" height="24" className="cursor-pointer hover:bg-nsp-teal/10 rounded-full p-1" />
                                    <Icon icon="ph:gif" width="24" height="24" className="cursor-pointer hover:bg-nsp-teal/10 rounded-full p-1" />
                                </div>
                                <button
                                    onClick={() => {
                                        const input = document.getElementById('post-detail-reply-input') as HTMLTextAreaElement;
                                        if (input && input.value.trim()) {
                                            onReply(post.id, input.value);
                                            input.value = '';
                                        }
                                    }}
                                    className="px-4 py-1.5 bg-nsp-teal text-white font-bold rounded-full text-sm hover:bg-nsp-dark-teal transition-colors"
                                >
                                    Reply
                                </button>
                            </div>
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
    const navigate = useNavigate();
    const { addToast } = useToast();
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

    const handleReply = async (id: string, content: string) => {
        if (!currentUser) return;
        try {
            await createComment(id, currentUser.id, content);
            addToast('success', 'Reply sent');
            // Reload comments
            const fetchedComments = await getComments(id);
            setComments(fetchedComments);
            // Update counts 
            setPost(prev => prev ? ({ ...prev, comments_count: prev.comments_count + 1 }) : null);
        } catch (err) {
            console.error('Failed to reply:', err);
            addToast('error', 'Failed to send reply');
        }
    };

    const handleReRack = async (id: string, type: 'simple' | 'quote', quoteText?: string) => {
        if (!currentUser) return;
        try {
            await createReRack(id, currentUser.id, quoteText);
            setPost(prev => prev ? ({ ...prev, reracks_count: prev.reracks_count + 1 }) : null);
            addToast('success', 'Post re-racked!');
        } catch (err) {
            console.error('Error reracking:', err);
            addToast('error', 'Failed to re-rack');
        }
    };

    const handleCommentReply = async (commentId: string, content: string) => {
        if (!currentUser || !post) return;
        try {
            await createComment(post.id, currentUser.id, content, commentId);
            addToast('success', 'Reply sent');
            // Reload comments
            const fetchedComments = await getComments(post.id);
            setComments(fetchedComments);
            // Update counts
            setPost(prev => prev ? ({ ...prev, comments_count: prev.comments_count + 1 }) : null);
        } catch (err) {
            console.error('Failed to reply to comment:', err);
            addToast('error', 'Failed to send reply');
        }
    };

    const handleDelete = async (postId: string) => {
        if (!currentUser) return;
        try {
            await deletePost(postId, currentUser.id);
            addToast('success', 'Post deleted');
            navigate(-1); // Go back
        } catch (err: any) {
            console.error('Failed to delete post:', err);
            addToast('error', 'Failed to delete post: ' + (err.message || 'Unknown error'));
        }
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
                onDelete={handleDelete}
            />
        </SocialLayout>
    );
};

export default PostDetail;
