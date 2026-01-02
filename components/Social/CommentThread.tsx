import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { Comment, User } from '../../types';
import { formatRelativeTime } from '../../utils/dateUtils';

interface CommentThreadProps {
  comments: Comment[];
  currentUser: User;
  onReply: (commentId: string, content: string) => void;
  depth?: number;
}

const CommentItem: React.FC<{
  comment: Comment;
  currentUser: User;
  onReply: (commentId: string, content: string) => void;
  depth: number;
}> = ({ comment, currentUser, onReply, depth }) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleReplySubmit = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText);
    setReplyText('');
    setIsReplying(false);
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-3' : 'mt-3'}`}>
      <div className="flex gap-2">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <img 
            src={comment.user.avatar || '/default-avatar.png'} 
            alt={comment.user.name} 
            className="w-8 h-8 rounded-full object-cover"
          />
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1 text-sm">
            <span className="font-bold text-gray-900 hover:underline cursor-pointer">
              {comment.user.name}
            </span>
            {comment.user.verified && (
              <Icon icon="ph:seal-check-fill" className="text-green-500" width="14" height="14" />
            )}
            <span className="text-gray-500">@{comment.user.handle}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500 text-xs">{formatRelativeTime(comment.created_at)}</span>
          </div>

          {/* Comment Text */}
          <div className="mt-1 text-gray-900 text-sm leading-normal whitespace-pre-wrap">
            {comment.content}
          </div>

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
              <img 
                src={currentUser.avatar || '/default-avatar.png'} 
                className="w-7 h-7 rounded-full object-cover" 
              />
              <div className="flex-1">
                <textarea 
                  className="w-full bg-gray-50 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-nsp-teal/20 text-gray-900 placeholder-gray-500 resize-none"
                  placeholder={`Reply to @${comment.user.handle}`}
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button 
                    onClick={() => setIsReplying(false)}
                    className="text-gray-600 text-xs font-medium px-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleReplySubmit}
                    disabled={!replyText.trim()}
                    className="bg-nsp-teal text-white text-xs font-bold px-3 py-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-nsp-dark-teal transition-colors"
                  >
                    Reply
                  </button>
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
