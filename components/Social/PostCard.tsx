import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Post, User, Comment } from '../../types';
import { analyzePost } from '../../services/geminiService';
import { renderContentWithLinks } from '../../utils/textParsing.tsx';
import { formatRelativeTime } from '../../utils/dateUtils';
import { getComments, createComment, subscribeToComments, savePost, unsavePost, incrementImpressions } from '../../services/postService';
import CommentThread from './CommentThread';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../Modals/ConfirmationModal';
import { getAvatarUrl } from '../../utils/userUtils';
import PollDisplay from './PollDisplay';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import GifPicker from '../Shared/GifPicker';
import { GifResult } from '../../services/gifService';
import Avatar from '../Shared/Avatar';
import VerifiedBadge from '../Shared/VerifiedBadge';

interface PostCardProps {
  post: Post;
  currentUser: User;
  onLike: (id: string) => void;
  onReply: (postId: string, content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'gif') => void;
  onReRack?: (postId: string, type: 'simple' | 'quote', quoteText?: string) => void;
  onDelete?: (postId: string) => void;
  isDetailView?: boolean;
  onPostUpdated?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUser, onLike, onReply, onReRack, onDelete, isDetailView = false, onPostUpdated }) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLElement>(null);
  const [hasViewed, setHasViewed] = useState(false);

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

  // Media state for reply
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'gif' | undefined>(undefined);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setReplyText(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleGifSelect = (gif: GifResult) => {
    setMediaUrl(gif.url);
    setMediaType('gif');
    setShowGifPicker(false);
  };

  const [isBookmarked, setIsBookmarked] = useState(post.is_saved_by_current_user || false);

  // Sync state with prop if it changes (e.g. initial load vs subsequent fetch)
  useEffect(() => {
    setIsBookmarked(post.is_saved_by_current_user || false);
  }, [post.is_saved_by_current_user]);

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

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;

    // Optimistic update
    const previousState = isBookmarked;
    setIsBookmarked(!previousState);

    try {
      if (previousState) {
        // Was bookmarked, now remove
        await unsavePost(post.id, currentUser.id);
        addToast('success', 'Post removed from Bookmarks');
      } else {
        // Was not bookmarked, now add
        await savePost(post.id, currentUser.id);
        addToast('success', 'Post added to Bookmarks');
      }

      if (onPostUpdated) onPostUpdated();
    } catch (error) {
      console.error('Bookmark toggle failed:', error);
      setIsBookmarked(previousState); // Revert
      addToast('error', 'Failed to update bookmark');
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
    if (!replyText.trim() && !mediaUrl) return;

    try {
      // Use the prop instead of direct call
      await onReply(post.id, replyText, mediaUrl || undefined, mediaType);
      setReplyText('');
      setMediaUrl(null);
      setMediaType(undefined);
      setIsReplying(false);
      setShowComments(true); // Show comments after posting
    } catch (error) {
      console.error('Failed to create comment:', error);
      // addToast handled by parent usually, but if parent throws we can catch here? 
      // Actually parent should handle toast.
    }
  };

  const handleCommentReply = async (parentCommentId: string, content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'gif') => {
    try {
      await createComment(post.id, currentUser.id, content, parentCommentId, mediaUrl, mediaType);
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
      ref={cardRef}
      className={`border-b border-gray-100 px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer ${!isDetailView ? '' : ''}`}
      onClick={handleCardClick}
    >
      {/* Re-Rack Header */}
      {post.is_rerack && (
        <div className="flex items-center gap-3 text-gray-500 text-[13px] font-bold mb-1 ml-[3.25rem]">
          <Icon icon="ph:repeat-bold" width="16" height="16" />
          <span className="hover:underline">{post.user?.name || 'Unknown User'} re-racked</span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar Column */}
        <div className="flex-shrink-0">
          <div
            className="relative group cursor-pointer"
            onClick={(e) => handleUserClick(e, post.user.id)}
          >
            <Avatar
              user={post.user}
              alt={post.user?.name}
              className="w-10 h-10 rounded-full object-cover hover:opacity-90 transition-opacity"
            />
          </div>
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">

          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-1 text-[15px] truncate leading-5">
              <span
                className="font-bold text-gray-900 hover:underline cursor-pointer"
                onClick={(e) => post.user && handleUserClick(e, post.user.id)}
              >
                {post.user?.name || 'Unknown User'}
              </span>
              <VerifiedBadge user={post.user} size={16} />
              <span
                className="text-gray-500 truncate"
              >
                @{post.user?.handle || 'unknown'}
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-500 hover:underline cursor-pointer">{formatRelativeTime(post.created_at)}</span>
            </div>

            <div className="relative group/menu">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="text-gray-400 hover:text-nsp-teal p-1.5 rounded-full hover:bg-nsp-teal/10 transition-colors -mr-2"
              >
                <Icon icon="ph:dots-three-bold" width="18" height="18" />
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 top-0 mt-6 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  {currentUser.id === post.user_id ? (
                    <button
                      onClick={handleDeleteClick}
                      className="w-full px-4 py-3 text-left text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors font-bold"
                    >
                      <Icon icon="ph:trash" width="18" height="18" />
                      <span className="text-[15px]">Delete</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => { setShowMenu(false); alert('Report logic to be implemented'); }}
                      className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors font-medium"
                    >
                      <Icon icon="ph:flag" width="18" height="18" />
                      <span className="text-[15px]">Report Post</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Text Body - Quote Text for Quote Re-Racks */}
          {post.is_rerack && post.quote_text && (
            <div className="mt-0.5 mb-2 text-gray-900 text-[15px] leading-6 whitespace-pre-wrap">
              {renderContentWithLinks(post.quote_text)}
            </div>
          )}

          {/* Original Post for Quote Re-Racks */}
          {post.is_rerack && post.original_post && (
            <div className="mt-2 mb-2 border border-gray-200 rounded-2xl p-4 hover:bg-black/[0.02] transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.original_post!.id}`) }}>
              <div className="flex gap-2">
                <Avatar
                  user={post.original_post.user}
                  alt={post.original_post.user?.name}
                  className="w-5 h-5 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-[15px]">
                    <span className="font-bold text-gray-900 leading-tight">{post.original_post.user?.name || 'Unknown User'}</span>
                    <VerifiedBadge user={post.original_post.user} size={14} />
                    <span className="text-gray-500 truncate">@{post.original_post.user?.handle || 'unknown'}</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-500">{formatRelativeTime(post.original_post.created_at)}</span>
                  </div>
                  <div className="mt-1 text-gray-900 text-[15px] leading-6">
                    {renderContentWithLinks(post.original_post.content)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Poll Display */}
          {post.poll_id && (
            <PollDisplay pollId={post.poll_id} currentUserId={currentUser.id} />
          )}

          {/* Text Body - Regular Posts */}
          {!post.is_rerack && (
            <div className="mt-0.5 mb-2 text-gray-900 text-[15px] leading-6 whitespace-pre-wrap">
              {renderContentWithLinks(post.content)}
            </div>
          )}

          {/* Media Attachments - Regular Posts Only */}
          {!post.is_rerack && post.images && post.images.length > 0 && (
            <>
              {post.media_type === 'gif' ? (
                <div className="mb-2 mt-2 rounded-2xl overflow-hidden border border-gray-200">
                  <img src={post.images[0]} alt="GIF" className="w-full h-auto object-cover max-h-[500px]" />
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">GIF</div>
                </div>
              ) : post.media_type === 'video' ? (
                <div className="mb-2 mt-2 rounded-2xl overflow-hidden border border-gray-200 bg-black">
                  <video src={post.images[0]} controls className="w-full h-auto max-h-[500px]" />
                </div>
              ) : (
                <div className={`mb-2 mt-2 grid gap-0.5 rounded-2xl overflow-hidden border border-gray-200 ${post.images.length === 1 ? 'grid-cols-1' :
                  post.images.length === 2 ? 'grid-cols-2' :
                    post.images.length === 3 ? 'grid-cols-2' : // 3 images: usually split
                      'grid-cols-2'
                  }`}>
                  {/* Simplified Grid: 3 images handled as 2 cols, 2 rows? For now keep simple grid */}
                  {post.images.map((image, index) => (
                    <div key={index} className="overflow-hidden bg-gray-100">
                      <img src={image} alt={`Post media ${index + 1}`} className="w-full h-full object-cover min-h-[200px]" />
                    </div>
                  ))}
                </div>
              )}
            </>
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

          {/* Action Bar */}
          <div className="flex justify-between items-center w-full md:max-w-[425px] mt-3 pr-2 md:pr-0">

            {/* Reply */}
            <div className="group flex items-center gap-1 cursor-pointer -ml-2" onClick={toggleComments}>
              <div className="p-2 rounded-full group-hover:bg-[#1d9bf0]/10 text-gray-500 group-hover:text-[#1d9bf0] transition-colors">
                <Icon icon="ph:chat-circle" width="18" height="18" />
              </div>
              <span className="text-[13px] text-gray-500 group-hover:text-[#1d9bf0] transition-colors">{post.comments_count || ''}</span>
            </div>

            {/* Re-Rack */}
            <div className="group flex items-center gap-1 cursor-pointer -ml-2 relative">
              <div
                className="p-2 rounded-full group-hover:bg-[#00ba7c]/10 text-gray-500 group-hover:text-[#00ba7c] transition-colors"
                onClick={handleReRackClick}
              >
                <Icon icon="ph:repeat-bold" width="18" height="18" />
              </div>
              <span className="text-[13px] text-gray-500 group-hover:text-[#00ba7c] transition-colors">{post.reracks_count || ''}</span>
              {/* Menu */}
              {showReRackMenu && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
                  <button onClick={handleSimpleReRack} className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-900 font-bold text-[14px]">
                    <Icon icon="ph:repeat-bold" width="18" height="18" /> Re-Rack
                  </button>
                  <button onClick={handleQuoteReRack} className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-900 font-bold text-[14px]">
                    <Icon icon="ph:pencil-simple" width="18" height="18" /> Quote
                  </button>
                </div>
              )}
            </div>

            {/* Like */}
            <div className="group flex items-center gap-1 cursor-pointer -ml-2" onClick={(e) => { e.stopPropagation(); onLike(post.id); }}>
              <div className="p-2 rounded-full group-hover:bg-[#f91880]/10 text-gray-500 group-hover:text-[#f91880] transition-colors">
                <Icon icon={post.is_liked_by_current_user ? "ph:heart-fill" : "ph:heart"} width="18" height="18" className={post.is_liked_by_current_user ? "text-[#f91880]" : ""} />
              </div>
              <span className={`text-[13px] ${post.is_liked_by_current_user ? "text-[#f91880]" : "text-gray-500 group-hover:text-[#f91880]"} transition-colors`}>{post.likes_count || ''}</span>
            </div>

            {/* View/Stats */}
            <div className="group flex items-center gap-1 cursor-pointer -ml-2">
              <div className="p-2 rounded-full group-hover:bg-[#1d9bf0]/10 text-gray-500 group-hover:text-[#1d9bf0] transition-colors">
                <Icon icon="ph:chart-bar" width="18" height="18" />
              </div>
              <span className="text-[13px] text-gray-500 group-hover:text-[#1d9bf0] transition-colors">
                {post.impressions_count > 0 ? (
                  post.impressions_count >= 1000 ? `${(post.impressions_count / 1000).toFixed(1)}k` : post.impressions_count
                ) : ''}
              </span>
            </div>

            {/* Bookmark */}
            <div className="group flex items-center gap-1 cursor-pointer -ml-2" onClick={handleBookmark}>
              <div className="p-2 rounded-full group-hover:bg-[#1d9bf0]/10 text-gray-500 group-hover:text-[#1d9bf0] transition-colors">
                <Icon icon={isBookmarked ? "ph:bookmark-fill" : "ph:bookmark"} width="18" height="18" className={isBookmarked ? "text-[#1d9bf0]" : ""} />
              </div>
            </div>

            {/* Share */}
            <div className="group flex items-center gap-1 cursor-pointer -ml-2">
              <div className="p-2 rounded-full group-hover:bg-[#1d9bf0]/10 text-gray-500 group-hover:text-[#1d9bf0] transition-colors">
                <Icon icon="ph:share-network" width="18" height="18" />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4" onClick={(e) => e.stopPropagation()}>
          {/* Reply Input Area */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex gap-3">
              <Avatar user={currentUser} className="w-8 h-8 rounded-full object-cover" />
              <div className="flex-1">
                <textarea
                  ref={replyTextareaRef}
                  className="w-full bg-gray-50 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-nsp-teal/20 text-black placeholder-gray-600 resize-none"
                  placeholder="Post your reply"
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />

                {mediaUrl && (
                  <div className="mt-2 relative inline-block">
                    <img src={mediaUrl} className="max-h-40 rounded-lg" alt="Preview" />
                    <button
                      onClick={() => { setMediaUrl(null); setMediaType(undefined); }}
                      className="absolute top-1 right-1 bg-black/75 text-white rounded-full p-1"
                    >
                      <Icon icon="ph:x-bold" width="10" height="10" />
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-2 relative">
                    <button onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }} className="text-nsp-teal hover:bg-nsp-teal/10 p-1 rounded-full">
                      <Icon icon="ph:gif" width="20" height="20" />
                    </button>
                    <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }} className="text-nsp-teal hover:bg-nsp-teal/10 p-1 rounded-full">
                      <Icon icon="ph:smiley" width="20" height="20" />
                    </button>

                    {showGifPicker && (
                      <div className="absolute top-8 left-0 z-50 shadow-xl">
                        <div className="fixed inset-0 z-40" onClick={() => setShowGifPicker(false)} />
                        <div className="relative z-50">
                          <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />
                        </div>
                      </div>
                    )}

                    {showEmojiPicker && (
                      <div className="absolute top-8 left-0 z-50 shadow-xl">
                        <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                        <div className="relative z-50">
                          <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            theme={Theme.LIGHT}
                            width={300}
                            height={350}
                            previewConfig={{ showPreview: false }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleReplySubmit}
                      disabled={!replyText.trim() && !mediaUrl}
                      className="bg-nsp-teal text-white text-sm font-bold px-4 py-1.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-nsp-dark-teal transition-colors"
                    >
                      Reply
                    </button>
                  </div>
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



      {/* Quote Re-Rack Modal */}
      {
        showQuoteModal && (
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
                  className="w-full bg-gray-50 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-nsp-teal/20 text-black placeholder-gray-600 resize-none"
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
                  <Avatar
                    user={post.user}
                    alt={post.user?.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-sm">
                      <span className="font-bold text-gray-900">{post.user?.name || 'Unknown User'}</span>
                      <VerifiedBadge user={post.user} size={14} />
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
        )
      }
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Post?"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
      />
    </article >
  );
};

export default PostCard;