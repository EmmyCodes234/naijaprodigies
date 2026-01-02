import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Post, User, Comment } from '../../types';
import { analyzePost } from '../../services/geminiService';
import { renderContentWithLinks } from '../../utils/textParsing.tsx';
import { formatRelativeTime } from '../../utils/dateUtils';
import { getComments, createComment, subscribeToComments } from '../../services/postService';
import CommentThread from './CommentThread';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../Modals/ConfirmationModal';
import { getAvatarUrl } from '../../utils/userUtils';

interface PostCardProps {
  post: Post;
  currentUser: User;
  onLike: (id: string) => void;
  onReply: (postId: string, content: string) => void;
  onReRack?: (postId: string, type: 'simple' | 'quote', quoteText?: string) => void;
  onDelete?: (postId: string) => void;
  isDetailView?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUser, onLike, onReply, onReRack, onDelete, isDetailView = false }) => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [aiComment, setAiComment] = useState<string | null>(post.aiCommentary || null);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showReRackMenu, setShowReRackMenu] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteText, setQuoteText] = useState('');

  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Close menus when clicking outside
  useEffect(() => {
    const closeMenus = () => {
      setShowMenu(false);
      setShowReRackMenu(false);
    }
    document.addEventListener('click', closeMenus);
    return () => document.removeEventListener('click', closeMenus);
  }, []);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(post.id);
    }
  };
  // Subscribe to real-time comment updates for this specific post
  useEffect(() => {
    const unsubscribe = subscribeToComments(
      (newComment) => {
        // Only add comment if it's for this post and comments are visible
        if (newComment.post_id === post.id && showComments) {
          setComments(prevComments => {
            // If it's a reply, we need to rebuild the tree
            if (newComment.parent_comment_id) {
              // Reload comments to rebuild the tree properly
              loadComments();
              return prevComments;
            } else {
              // It's a root comment, add it to the list
              return [...prevComments, newComment];
            }
          });
        }
      },
      (error) => {
        console.error('Error in comment subscription:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [post.id, showComments]);

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const fetchedComments = await getComments(post.id);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAIJudge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (aiComment) return;
    setAnalyzing(true);
    try {
      const commentary = await analyzePost(post.content, !!post.image);
      setAiComment(commentary);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReplySubmit = async () => {
    if (!replyText.trim()) return;

    try {
      // Use the prop instead of direct call
      await onReply(post.id, replyText);
      setReplyText('');
      setIsReplying(false);
      setShowComments(true); // Show comments after posting
    } catch (error) {
      console.error('Failed to create comment:', error);
      // addToast handled by parent usually, but if parent throws we can catch here? 
      // Actually parent should handle toast.
    }
  };

  const handleCommentReply = async (parentCommentId: string, content: string) => {
    try {
      await createComment(post.id, currentUser.id, content, parentCommentId);
      addToast('success', 'Reply sent');
      // The real-time subscription will handle updating the UI
    } catch (error) {
      console.error('Failed to create reply:', error);
      addToast('error', 'Failed to post reply');
    }
  };

  const toggleComments = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDetailView) {
      // If we are not in detail view, maybe just navigate to detail view for comments?
      // Or keep existing behavior of inline comments?
      // Let's keep existing behavior for now as it's nice to have.
      setShowComments(!showComments);
    }
  };

  const handleReRackClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReRackMenu(!showReRackMenu);
  };

  const handleSimpleReRack = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReRackMenu(false);

    if (onReRack) {
      try {
        await onReRack(post.id, 'simple');
      } catch (error) {
        console.error('Failed to re-rack:', error);
        alert('Failed to re-rack post. Please try again.');
      }
    }
  };

  const handleQuoteReRack = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReRackMenu(false);
    setShowQuoteModal(true);
  };

  const handleQuoteSubmit = async () => {
    if (!quoteText.trim()) {
      alert('Please add a comment for your quote re-rack');
      return;
    }

    if (onReRack) {
      try {
        await onReRack(post.id, 'quote', quoteText);
        setQuoteText('');
        setShowQuoteModal(false);
      } catch (error) {
        console.error('Failed to quote re-rack:', error);
        alert('Failed to quote re-rack. Please try again.');
      }
    }
  };

  const handleUserClick = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    navigate(`/profile/${userId}`);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (!isDetailView) {
      navigate(`/post/${post.id}`);
    }
  };

  return (
    <article
      className={`border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors w-full ${!isDetailView ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      {/* Re-Rack Header */}
      {post.is_rerack && (
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-2 ml-12">
          <Icon icon="ph:arrows-left-right" width="16" height="16" />
          <span className="font-semibold">{post.user?.name || 'Unknown User'} re-racked</span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar Column */}
        <div className="flex-shrink-0">
          <div
            className="relative group cursor-pointer"
            onClick={(e) => handleUserClick(e, post.user.id)}
          >
            <img
              src={getAvatarUrl(post.user)}
              alt={post.user?.name || 'Unknown User'}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="absolute inset-0 bg-black/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            {post.user?.rank === 'Grandmaster' && (
              <div className="absolute -bottom-1 -right-1 bg-nsp-yellow text-nsp-dark-teal p-0.5 rounded-full border border-white" title="Grandmaster">
                <Icon icon="ph:crown-fill" width="10" height="10" />
              </div>
            )}
          </div>
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">

          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-1 text-sm truncate">
              <span
                className="font-bold text-gray-900 hover:underline cursor-pointer"
                onClick={(e) => post.user && handleUserClick(e, post.user.id)}
              >
                {post.user?.name || 'Unknown User'}
              </span>
              {post.user?.verified && <Icon icon="ph:seal-check-fill" className="text-green-500" width="16" height="16" />}
              <span
                className="text-gray-500 hover:underline cursor-pointer"
                onClick={(e) => post.user && handleUserClick(e, post.user.id)}
              >
                @{post.user?.handle || 'unknown'}
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-500 hover:underline">{formatRelativeTime(post.created_at)}</span>
            </div>

            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="text-gray-400 hover:text-nsp-teal p-1 rounded-full hover:bg-nsp-teal/10 transition-colors"
              >
                <Icon icon="ph:dots-three-bold" />
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  {currentUser.id === post.user_id ? (
                    <button
                      onClick={handleDeleteClick}
                      className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <Icon icon="ph:trash" width="16" height="16" />
                      <span className="text-sm font-medium">Delete Post</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => { setShowMenu(false); alert('Report logic to be implemented'); }}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    >
                      <Icon icon="ph:flag" width="16" height="16" />
                      <span className="text-sm font-medium">Report Post</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Text Body - Quote Text for Quote Re-Racks */}
          {post.is_rerack && post.quote_text && (
            <div className="mt-1 mb-3 text-gray-900 text-[15px] leading-normal whitespace-pre-wrap">
              {renderContentWithLinks(post.quote_text)}
            </div>
          )}

          {/* Original Post for Re-Racks */}
          {post.is_rerack && post.original_post && (
            <div className="mt-2 mb-3 border border-gray-200 rounded-2xl p-3 hover:bg-gray-50 transition-colors">
              <div className="flex gap-2">
                <img
                  src={getAvatarUrl(post.original_post.user)}
                  alt={post.original_post.user?.name || 'Unknown User'}
                  className="w-8 h-8 rounded-full object-cover cursor-pointer"
                  onClick={(e) => post.original_post?.user && handleUserClick(e, post.original_post.user.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-sm">
                    <span
                      className="font-bold text-gray-900 hover:underline cursor-pointer"
                      onClick={(e) => post.original_post?.user && handleUserClick(e, post.original_post.user.id)}
                    >
                      {post.original_post.user?.name || 'Unknown User'}
                    </span>
                    {post.original_post.user?.verified && <Icon icon="ph:seal-check-fill" className="text-green-500" width="14" height="14" />}
                    <span
                      className="text-gray-500 hover:underline cursor-pointer"
                      onClick={(e) => post.original_post?.user && handleUserClick(e, post.original_post.user.id)}
                    >
                      @{post.original_post.user?.handle || 'unknown'}
                    </span>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-500">{formatRelativeTime(post.original_post.created_at)}</span>
                  </div>
                  <div className="mt-1 text-gray-900 text-sm">
                    {renderContentWithLinks(post.original_post.content)}
                  </div>
                  {post.original_post.images && post.original_post.images.length > 0 && (
                    <div className={`mt-2 grid gap-1 ${post.original_post.images.length === 1 ? 'grid-cols-1' :
                      post.original_post.images.length === 2 ? 'grid-cols-2' :
                        'grid-cols-2'
                      }`}>
                      {post.original_post.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Original post media ${index + 1}`}
                          className="w-full h-auto object-cover rounded-lg max-h-[200px]"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Text Body - Regular Posts */}
          {!post.is_rerack && (
            <div className="mt-1 mb-3 text-gray-900 text-[15px] leading-normal whitespace-pre-wrap">
              {renderContentWithLinks(post.content)}
            </div>
          )}

          {/* Image Attachments - Regular Posts Only */}
          {!post.is_rerack && post.images && post.images.length > 0 && (
            <div className={`mb-3 mt-2 grid gap-2 ${post.images.length === 1 ? 'grid-cols-1' :
              post.images.length === 2 ? 'grid-cols-2' :
                post.images.length === 3 ? 'grid-cols-3' :
                  'grid-cols-2'
              }`}>
              {post.images.map((image, index) => (
                <div key={index} className="rounded-2xl overflow-hidden border border-gray-200">
                  <img src={image} alt={`Post media ${index + 1}`} className="w-full h-auto object-cover max-h-[500px]" />
                </div>
              ))}
            </div>
          )}

          {/* AI Judge Result */}
          {aiComment && (
            <div className="mb-3 mt-2 bg-gradient-to-r from-nsp-teal/5 to-transparent border-l-4 border-nsp-teal p-3 rounded-r-lg animate-fade-in">
              <div className="flex items-center gap-2 mb-1">
                <Icon icon="ph:gavel-fill" className="text-nsp-teal" />
                <span className="text-xs font-bold text-nsp-teal uppercase tracking-wider">The Judge's Verdict</span>
              </div>
              <p className="text-sm text-nsp-dark-teal italic">"{aiComment}"</p>
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex justify-between items-center max-w-[425px] mt-1 text-gray-500">
            {/* Reply/Comments */}
            <div
              className="group flex items-center gap-1 cursor-pointer"
              onClick={toggleComments}
            >
              <div className="p-2 rounded-full group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                <Icon icon="ph:chat-circle" width="18" height="18" />
              </div>
              <span className="text-xs group-hover:text-blue-500 transition-colors">{post.comments_count || ''}</span>
            </div>

            {/* Re-Rack */}
            <div className="group flex items-center gap-1 cursor-pointer relative">
              <div
                className="p-2 rounded-full group-hover:bg-green-50 group-hover:text-green-500 transition-colors"
                onClick={handleReRackClick}
              >
                <Icon icon="ph:arrows-left-right" width="18" height="18" />
              </div>
              <span className="text-xs group-hover:text-green-500 transition-colors">{post.reracks_count || ''}</span>

              {/* Re-Rack Menu */}
              {showReRackMenu && (
                <div
                  className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10 min-w-[200px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleSimpleReRack}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-900"
                  >
                    <Icon icon="ph:arrows-left-right" width="18" height="18" />
                    <span className="text-sm font-medium">Re-Rack</span>
                  </button>
                  <button
                    onClick={handleQuoteReRack}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-900"
                  >
                    <Icon icon="ph:quotes" width="18" height="18" />
                    <span className="text-sm font-medium">Quote Re-Rack</span>
                  </button>
                </div>
              )}
            </div>

            {/* Like */}
            <div className="group flex items-center gap-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); onLike(post.id); }}>
              <div className="p-2 rounded-full group-hover:bg-pink-50 group-hover:text-pink-500 transition-colors">
                <Icon icon={post.is_liked_by_current_user ? "ph:heart-fill" : "ph:heart"} width="18" height="18" className={post.is_liked_by_current_user ? "text-pink-500" : ""} />
              </div>
              <span className={`text-xs group-hover:text-pink-500 transition-colors ${post.is_liked_by_current_user ? "text-pink-500" : ""}`}>{post.likes_count || ''}</span>
            </div>

            {/* AI Judge (Unique Feature) */}
            <div className="group flex items-center gap-1 cursor-pointer" onClick={handleAIJudge} title="Ask AI Judge">
              <div className={`p-2 rounded-full transition-colors ${analyzing ? 'bg-nsp-teal/10 text-nsp-teal' : 'group-hover:bg-nsp-teal/10 group-hover:text-nsp-teal'}`}>
                {analyzing ? <Icon icon="line-md:loading-twotone-loop" width="18" height="18" /> : <Icon icon="ph:sparkle" width="18" height="18" />}
              </div>
            </div>

            {/* Share */}
            <div className="group flex items-center gap-1 cursor-pointer">
              <div className="p-2 rounded-full group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                <Icon icon="ph:share-network" width="18" height="18" />
              </div>
            </div>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="mt-4" onClick={(e) => e.stopPropagation()}>
              {/* Reply Input Area */}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex gap-3">
                  <img src={getAvatarUrl(currentUser)} className="w-8 h-8 rounded-full object-cover" />
                  <div className="flex-1">
                    <textarea
                      className="w-full bg-gray-50 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-nsp-teal/20 text-gray-900 placeholder-gray-500 resize-none"
                      placeholder="Post your reply"
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleReplySubmit}
                        disabled={!replyText.trim()}
                        className="bg-nsp-teal text-white text-sm font-bold px-4 py-1.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-nsp-dark-teal transition-colors"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <Icon icon="line-md:loading-twotone-loop" width="24" height="24" className="text-nsp-teal" />
                </div>
              ) : (
                <CommentThread
                  comments={comments}
                  currentUser={currentUser}
                  onReply={handleCommentReply}
                />
              )}
            </div>
          )}

        </div>
      </div>

      {/* Quote Re-Rack Modal */}
      {showQuoteModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            e.stopPropagation();
            setShowQuoteModal(false);
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Quote Re-Rack</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQuoteModal(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <Icon icon="ph:x" width="24" height="24" />
              </button>
            </div>

            {/* Quote Input */}
            <div className="mb-4">
              <textarea
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Add your comment..."
                className="w-full bg-gray-50 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-nsp-teal/20 text-gray-900 placeholder-gray-500 resize-none"
                rows={3}
                maxLength={280}
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {quoteText.length}/280
              </div>
            </div>

            {/* Original Post Preview */}
            <div className="border border-gray-200 rounded-xl p-4 mb-4">
              <div className="flex gap-3">
                <img
                  src={getAvatarUrl(post.user)}
                  alt={post.user?.name || 'Unknown User'}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-sm">
                    <span className="font-bold text-gray-900">{post.user?.name || 'Unknown User'}</span>
                    {post.user?.verified && <Icon icon="ph:seal-check-fill" className="text-green-500" width="14" height="14" />}
                    <span className="text-gray-500">@{post.user?.handle || 'unknown'}</span>
                  </div>
                  <div className="mt-1 text-gray-900 text-sm">
                    {post.content}
                  </div>
                  {post.images && post.images.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {post.images.slice(0, 2).map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleQuoteSubmit}
              disabled={!quoteText.trim()}
              className="w-full bg-nsp-teal text-white font-bold py-2 px-4 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-nsp-dark-teal transition-colors"
            >
              Quote Re-Rack
            </button>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Post?"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
      />
    </article>
  );
};

export default PostCard;