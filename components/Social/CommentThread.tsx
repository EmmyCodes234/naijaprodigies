import React, { useState, useRef } from 'react';
import { Icon } from '@iconify/react';
import { Comment, User } from '../../types';
import { formatRelativeTime } from '../../utils/dateUtils';
import Avatar from '../Shared/Avatar';
import VerifiedBadge from '../Shared/VerifiedBadge';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import GifPicker from '../Shared/GifPicker';
import { GifResult } from '../../services/gifService';
import { uploadImage } from '../../services/imageService';
import { useNavigate } from 'react-router-dom';

interface CommentThreadProps {
  comments: Comment[];
  currentUser: User;
  onReply: (commentId: string | null, content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'gif') => void;
  postAuthorHandle?: string;
}

interface CommentItemProps {
  comment: Comment;
  currentUser: User;
  onReply: (commentId: string | null, content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'gif') => void;
  depth: number;
  hasMoreReplies: boolean;
  isLastReply?: boolean;
  replyToHandle?: string; // The handle this comment is replying to
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUser,
  onReply,
  depth,
  hasMoreReplies,
  isLastReply,
  replyToHandle
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'gif' | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleReplySubmit = () => {
    if ((!replyText.trim() && !mediaUrl)) return;
    onReply(comment.id, replyText, mediaUrl || undefined, mediaType);
    setReplyText('');
    setMediaUrl(null);
    setMediaType(undefined);
    setIsReplying(false);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setReplyText(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleGifSelect = (gif: GifResult) => {
    setMediaUrl(gif.url);
    setMediaType('gif');
    setShowGifPicker(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const url = await uploadImage(file, currentUser.id);
      setMediaUrl(url);
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
    } catch (err) {
      console.error('Failed to upload:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const hasReplies = comment.replies && comment.replies.length > 0;
  const showThreadLine = hasReplies || hasMoreReplies;

  return (
    <article className="relative">
      {/* Thread connecting line */}
      {showThreadLine && (
        <div
          className="absolute left-4 top-12 bottom-0 w-0.5 bg-gray-200"
          style={{ transform: 'translateX(-50%)' }}
        />
      )}

      <div className="flex gap-3 py-3 px-4 hover:bg-gray-50/50 transition-colors">
        {/* Avatar Column */}
        <div className="flex-shrink-0 relative z-10">
          <button onClick={() => navigate(`/profile/${comment.user.handle}`)}>
            <Avatar
              user={comment.user}
              alt={comment.user?.name || 'User'}
              className="w-8 h-8 rounded-full object-cover hover:opacity-90 transition-opacity"
            />
          </button>
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          {/* "Replying to @handle" indicator */}
          {replyToHandle && (
            <div className="text-gray-500 text-[13px] mb-1">
              Replying to{' '}
              <button
                onClick={() => navigate(`/profile/${replyToHandle}`)}
                className="text-nsp-teal hover:underline"
              >
                @{replyToHandle}
              </button>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => navigate(`/profile/${comment.user.handle}`)}
              className="font-bold text-[15px] text-gray-900 hover:underline"
            >
              {comment.user?.name || 'Unknown User'}
            </button>
            <VerifiedBadge user={comment.user} size={14} />
            <span className="text-gray-500 text-[15px]">@{comment.user.handle}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500 text-[15px] hover:underline cursor-pointer">
              {formatRelativeTime(comment.created_at)}
            </span>
          </div>

          {/* Comment Text */}
          <div className="mt-1 text-[15px] text-gray-900 leading-normal whitespace-pre-wrap break-words">
            {comment.content}
          </div>

          {/* Media Attachment */}
          {comment.media_url && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 max-w-[400px]">
              {comment.media_type === 'video' ? (
                <video src={comment.media_url} controls className="w-full max-h-[300px] object-cover bg-black" />
              ) : (
                <img src={comment.media_url} alt="Attachment" className="w-full max-h-[300px] object-cover" loading="lazy" />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-6 mt-3">
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="group flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition-colors"
            >
              <div className="p-1.5 rounded-full group-hover:bg-blue-500/10 transition-colors">
                <Icon icon="ph:chat-circle" width="16" height="16" />
              </div>
              <span className="text-[13px]">Reply</span>
            </button>

            {comment.replies && comment.replies.length > 0 && (
              <span className="text-[13px] text-gray-500">
                {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </div>

          {/* Reply Input */}
          {isReplying && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex gap-3">
                <Avatar user={currentUser} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                <div className="flex-1">
                  <textarea
                    ref={replyTextareaRef}
                    className="w-full bg-transparent text-[15px] text-gray-900 placeholder-gray-500 resize-none focus:outline-none min-h-[60px]"
                    placeholder={`Reply to @${comment.user.handle}...`}
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    autoFocus
                  />

                  {/* Media Preview */}
                  {mediaUrl && (
                    <div className="mt-2 relative inline-block max-w-[200px]">
                      {mediaType === 'video' ? (
                        <video src={mediaUrl} className="rounded-xl max-h-40" controls />
                      ) : (
                        <img src={mediaUrl} className="rounded-xl max-h-40" alt="Preview" />
                      )}
                      <button
                        onClick={() => { setMediaUrl(null); setMediaType(undefined); }}
                        className="absolute top-2 right-2 bg-black/75 hover:bg-black text-white rounded-full p-1 transition-colors"
                      >
                        <Icon icon="ph:x-bold" width="12" height="12" />
                      </button>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                    <div className="flex gap-1 relative">
                      {/* Image/Video Upload */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*,video/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="p-2 text-nsp-teal hover:bg-nsp-teal/10 rounded-full transition-colors disabled:opacity-50"
                        title="Add image or video"
                      >
                        {isUploading ? (
                          <Icon icon="line-md:loading-loop" width="18" height="18" />
                        ) : (
                          <Icon icon="ph:image" width="18" height="18" />
                        )}
                      </button>

                      {/* GIF */}
                      <button
                        onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
                        className={`p-2 rounded-full transition-colors ${showGifPicker ? 'text-nsp-teal bg-nsp-teal/10' : 'text-nsp-teal hover:bg-nsp-teal/10'}`}
                        title="Add GIF"
                      >
                        <Icon icon="ph:gif" width="18" height="18" />
                      </button>

                      {/* Emoji */}
                      <button
                        onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                        className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'text-nsp-teal bg-nsp-teal/10' : 'text-nsp-teal hover:bg-nsp-teal/10'}`}
                        title="Add emoji"
                      >
                        <Icon icon="ph:smiley" width="18" height="18" />
                      </button>

                      {/* GIF Picker */}
                      {showGifPicker && (
                        <div className="absolute bottom-full left-0 mb-2 z-50">
                          <div className="fixed inset-0 z-40" onClick={() => setShowGifPicker(false)} />
                          <div className="relative z-50 shadow-xl rounded-xl overflow-hidden">
                            <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />
                          </div>
                        </div>
                      )}

                      {/* Emoji Picker */}
                      {showEmojiPicker && (
                        <div className="absolute bottom-full left-0 mb-2 z-50">
                          <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                          <div className="relative z-50 shadow-xl rounded-xl overflow-hidden">
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

                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsReplying(false)}
                        className="text-gray-600 text-sm font-medium px-4 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReplySubmit}
                        disabled={(!replyText.trim() && !mediaUrl) || isUploading}
                        className="bg-gray-900 hover:bg-black text-white text-sm font-bold px-4 py-1.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {hasReplies && (
        <div className="relative">
          {comment.replies!.map((reply, index) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              onReply={onReply}
              depth={depth + 1}
              hasMoreReplies={index < comment.replies!.length - 1}
              isLastReply={index === comment.replies!.length - 1}
              replyToHandle={comment.user.handle}
            />
          ))}
        </div>
      )}
    </article>
  );
};

const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  currentUser,
  onReply,
  postAuthorHandle
}) => {
  if (comments.length === 0) {
    return null;
  }

  return (
    <div className="divide-y divide-gray-100">
      {comments.map((comment, index) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          currentUser={currentUser}
          onReply={onReply}
          depth={0}
          hasMoreReplies={false}
          replyToHandle={postAuthorHandle}
        />
      ))}
    </div>
  );
};

export default CommentThread;
