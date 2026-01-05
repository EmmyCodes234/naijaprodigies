import React, { useState, useRef } from 'react';
import { Icon } from '@iconify/react';
import { Comment, User } from '../../types';
import { formatRelativeTime } from '../../utils/dateUtils';
import { getAvatarUrl } from '../../utils/userUtils';
import Avatar from '../Shared/Avatar';
import VerifiedBadge from '../Shared/VerifiedBadge';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import GifPicker from '../Shared/GifPicker';
import { GifResult } from '../../services/gifService';

interface CommentThreadProps {
  comments: Comment[];
  currentUser: User;
  onReply: (commentId: string, content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'gif') => void;
  depth?: number;
}

const CommentItem: React.FC<{
  comment: Comment;
  currentUser: User;
  onReply: (commentId: string, content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'gif') => void;
  depth: number;
}> = ({ comment, currentUser, onReply, depth }) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'gif' | undefined>(undefined);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-3' : 'mt-3'}`}>
      <div className="flex gap-2">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <Avatar
            user={comment.user}
            alt={comment.user?.name || 'User'}
            className="w-8 h-8 rounded-full object-cover"
          />
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1 text-sm">
            <span className="font-bold text-gray-900 hover:underline cursor-pointer">
              {comment.user?.name || 'Unknown User'}
            </span>
            <VerifiedBadge user={comment.user} size={14} />
            <span className="text-gray-500">@{comment.user.handle}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500 text-xs">{formatRelativeTime(comment.created_at)}</span>
          </div>

          {/* Comment Text */}
          <div className="mt-1 text-gray-900 text-sm leading-normal whitespace-pre-wrap">
            {comment.content}
          </div>

          {/* Media Attachment */}
          {comment.media_url && (
            <div className="mt-2">
              {comment.media_type === 'video' ? (
                <video src={comment.media_url} controls className="max-h-60 rounded-xl" />
              ) : (
                <img src={comment.media_url} alt="Attachment" className="max-h-60 rounded-xl border border-gray-100" />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 mt-2 text-gray-500">
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="flex items-center gap-1 text-xs hover:text-blue-500 transition-colors"
            >
              <Icon icon="ph:chat-circle" width="14" height="14" />
              <span>Reply</span>
            </button>
          </div>

          {/* Reply Input */}
          {isReplying && (
            <div className="mt-3 flex gap-2">
              <Avatar
                user={currentUser}
                className="w-7 h-7 rounded-full object-cover"
              />
              <div className="flex-1">
                <textarea
                  ref={replyTextareaRef}
                  className="w-full bg-gray-50 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-nsp-teal/20 text-black placeholder-gray-500 resize-none"
                  placeholder={`Reply to @${comment.user.handle}`}
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  autoFocus
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

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsReplying(false)}
                      className="text-gray-600 text-xs font-medium px-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReplySubmit}
                      disabled={!replyText.trim() && !mediaUrl}
                      className="bg-nsp-teal text-white text-xs font-bold px-3 py-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-nsp-dark-teal transition-colors"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUser={currentUser}
                  onReply={onReply}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  currentUser,
  onReply,
  depth = 0
}) => {
  if (comments.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          currentUser={currentUser}
          onReply={onReply}
          depth={depth}
        />
      ))}
    </div>
  );
};

export default CommentThread;
