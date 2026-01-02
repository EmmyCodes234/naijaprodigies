import React from 'react';
import { Icon } from '@iconify/react';
import { Conversation } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  currentUserId: string;
}

/**
 * ConversationList Component
 * Displays list of conversations ordered by most recent message
 * Shows unread indicators
 * Requirements: 10.3, 10.4
 */
const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  currentUserId
}) => {
  
  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Icon icon="ph:chat-circle-dots" width="64" height="64" className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium mb-2">No messages yet</p>
          <p className="text-sm text-gray-400">Start a conversation with someone!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conversation) => {
        // Get the other participant (not the current user)
        const otherParticipant = conversation.participants?.[0];
        
        if (!otherParticipant) {
          return null;
        }

        const isSelected = conversation.id === selectedConversationId;
        const hasUnread = (conversation.unread_count || 0) > 0;
        const lastMessage = conversation.last_message;
        const isCurrentUserSender = lastMessage?.sender_id === currentUserId;

        return (
          <div
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`
              flex items-start gap-3 p-4 cursor-pointer transition-colors border-b border-gray-100
              ${isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'}
            `}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <img
                src={otherParticipant.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParticipant.handle}`}
                alt={otherParticipant.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              {hasUnread && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-nsp-teal rounded-full border-2 border-white"></div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <span className={`font-bold text-sm truncate ${hasUnread ? 'text-gray-900' : 'text-gray-900'}`}>
                    {otherParticipant.name}
                  </span>
                  {otherParticipant.verified && (
                    <Icon icon="ph:seal-check-fill" className="text-green-500 flex-shrink-0" width="16" height="16" />
                  )}
                  <span className="text-gray-500 text-sm truncate">
                    @{otherParticipant.handle}
                  </span>
                </div>
                
                {lastMessage && (
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: false })}
                  </span>
                )}
              </div>

              {/* Last Message Preview */}
              {lastMessage && (
                <div className="flex items-center gap-1">
                  {isCurrentUserSender && (
                    <span className="text-gray-500 text-sm flex-shrink-0">You:</span>
                  )}
                  <p className={`text-sm truncate ${hasUnread ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                    {lastMessage.content}
                  </p>
                </div>
              )}
            </div>

            {/* Unread Count Badge */}
            {hasUnread && (
              <div className="flex-shrink-0 ml-2">
                <div className="bg-nsp-teal text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {conversation.unread_count}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ConversationList;
