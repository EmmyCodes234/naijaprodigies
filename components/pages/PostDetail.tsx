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
import Avatar from '../Shared/Avatar';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import GifPicker from '../Shared/GifPicker';
import { GifResult } from '../../services/gifService';

const PostDetailContent: React.FC<{
    currentUser: any;
    post: Post | null;
    comments: Comment[];
    isLoading: boolean;
    error: string | null;
    onLike: (postId: string) => void;
    onReply: (postId: string, content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'gif') => void;
    onReRack: (postId: string, type: 'simple' | 'quote', quoteText?: string) => void;
    onCommentReply: (commentId: string, content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'gif') => void;
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

        // Local state for reply input
        const [replyContent, setReplyContent] = useState('');
        const [showEmojiPicker, setShowEmojiPicker] = useState(false);
        const [showGifPicker, setShowGifPicker] = useState(false);
        const [mediaUrl, setMediaUrl] = useState<string | null>(null);
        const [mediaType, setMediaType] = useState<'image' | 'video' | 'gif' | undefined>(undefined);
        const replyTextareaRef = React.useRef<HTMLTextAreaElement>(null);

        const handleEmojiClick = (emojiData: EmojiClickData) => {
            if (replyTextareaRef.current) {
                const start = replyTextareaRef.current.selectionStart;
                const end = replyTextareaRef.current.selectionEnd;
                const newContent = replyContent.substring(0, start) + emojiData.emoji + replyContent.substring(end);
                setReplyContent(newContent);
                setTimeout(() => {
                    if (replyTextareaRef.current) {
                        replyTextareaRef.current.selectionStart = replyTextareaRef.current.selectionEnd = start + emojiData.emoji.length;
                        replyTextareaRef.current.focus();
                    }
                }, 0);
            } else {
                setReplyContent(prev => prev + emojiData.emoji);
            }
            setShowEmojiPicker(false);
        };

        const handleGifSelect = (gif: GifResult) => {
            setMediaUrl(gif.url);
            setMediaType('gif');
            setShowGifPicker(false);
        };

        const clearMedia = () => {
            setMediaUrl(null);
            setMediaType(undefined);
        };


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
                <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3 transition-colors">
                    <div onClick={(e) => { e.stopPropagation(); navigate(-1); }} className="cursor-pointer p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                        <Icon icon="ph:arrow-left-bold" width="20" height="20" className="text-gray-900" />
                    </div>
                    <h2 className="font-bold text-xl text-gray-900">Post</h2>
                    <div className="flex-1"></div>
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
                        <Avatar user={currentUser} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex-1 relative">
                            <textarea
                                ref={replyTextareaRef}
                                value={replyContent}
                                onChange={(e) => {
                                    setReplyContent(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.value ? `${e.target.scrollHeight}px` : 'auto';
                                }}
                                className="w-full bg-transparent text-lg placeholder-gray-500 text-black focus:outline-none resize-none"
                                placeholder={`Reply to @${post.user.handle || 'user'}...`}
                                rows={2}
                            />

                            {/* Media Preview */}
                            {mediaUrl && (
                                <div className="mt-2 relative inline-block">
                                    <img src={mediaUrl} className="max-h-60 rounded-xl border border-gray-200" alt="Attachment" />
                                    <button
                                        onClick={clearMedia}
                                        className="absolute top-1 right-1 bg-black/75 text-white rounded-full p-1 hover:bg-black/90"
                                    >
                                        <Icon icon="ph:x-bold" width="12" height="12" />
                                    </button>
                                </div>
                            )}

                            <div className="flex justify-between items-center mt-2">
                                <div className="flex text-nsp-teal gap-2 relative z-20">
                                    <div className="relative">
                                        <button
                                            onClick={() => {
                                                setShowGifPicker(!showGifPicker);
                                                setShowEmojiPicker(false);
                                            }}
                                            className={`p-2 rounded-full hover:bg-nsp-teal/10 transition-colors ${showGifPicker ? 'bg-nsp-teal/10' : ''}`}
                                        >
                                            <Icon icon="ph:gif" width="24" height="24" />
                                        </button>
                                        {showGifPicker && (
                                            <div className="absolute top-10 left-0 shadow-xl z-50">
                                                <div className="fixed inset-0 z-40" onClick={() => setShowGifPicker(false)} />
                                                <div className="relative z-50">
                                                    <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={() => {
                                                setShowEmojiPicker(!showEmojiPicker);
                                                setShowGifPicker(false);
                                            }}
                                            className={`p-2 rounded-full hover:bg-nsp-teal/10 transition-colors ${showEmojiPicker ? 'bg-nsp-teal/10' : ''}`}
                                        >
                                            <Icon icon="ph:smiley" width="24" height="24" />
                                        </button>
                                        {showEmojiPicker && (
                                            <div className="absolute top-10 left-0 shadow-xl z-50 rounded-2xl">
                                                <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                                                <div className="relative z-50">
                                                    <EmojiPicker
                                                        onEmojiClick={handleEmojiClick}
                                                        theme={Theme.LIGHT}
                                                        width={300}
                                                        height={400}
                                                        previewConfig={{ showPreview: false }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (replyContent.trim() || mediaUrl) {
                                            onReply(post.id, replyContent, mediaUrl || undefined, mediaType);
                                            setReplyContent('');
                                            clearMedia();
                                        }
                                    }}
                                    disabled={!replyContent.trim() && !mediaUrl}
                                    className="px-4 py-1.5 bg-nsp-teal text-white font-bold rounded-full text-sm hover:bg-nsp-dark-teal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

    const handleReply = async (id: string, content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'gif') => {
        if (!currentUser) return;
        try {
            await createComment(id, currentUser.id, content, undefined, mediaUrl, mediaType);
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

    const handleCommentReply = async (commentId: string, content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'gif') => {
        if (!currentUser || !post) return;
        try {
            await createComment(post.id, currentUser.id, content, commentId, mediaUrl, mediaType);
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
