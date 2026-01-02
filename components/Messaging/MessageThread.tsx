import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { Conversation, Message, User } from '../../types';
import { getMessages, sendMessage, markConversationAsRead, subscribeToMessages } from '../../services/messageService';
import { format, isToday, isYesterday } from 'date-fns';

interface MessageThreadProps {
  conversation: Conversation;
  currentUser: User;
  onBack: () => void;
}

/**
 * MessageThread Component
 * Displays messages in a conversation with real-time updates
 * Allows sending new messages
 * Requirements: 10.1, 10.2
 */
const MessageThread: React.FC<MessageThreadProps> = ({
  conversation,
  currentUser,
  onBack
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const otherParticipant = conversation.participants?.[0];

  // Fetch messages when conversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoadingMessages(true);
        const fetchedMessages = await getMessages(conversation.id, currentUser.id);
        setMessages(fetchedMessages);
        setError(null);
        
        // Mark conversation as read
        await markConversationAsRead(conversation.id, currentUser.id);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages');
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [conversation.id, currentUser.id]);

  // Subscribe to real-time message updates
  useEffect(() => {
    const unsubscribe = subscribeToMessages(
      conversation.id,
      (newMessage) => {
        setMessages((prevMessages) => {
          // Prevent duplicates
          const exists = prevMessages.some(m => m.id === newMessage.id);
          if (exists) return prevMessages;
          return [...prevMessages, newMessage];
        });

        // Mark as read if the message is from the other user
        if (newMessage.sender_id !== currentUser.id) {
          markConversationAsRead(conversation.id, currentUser.id).catch(err => {
            console.error('Error marking conversation as read:', err);
          });
        }
      },
      (error) => {
        console.error('Real-time message subscription error:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [conversation.id, currentUser.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageContent.trim() || !otherParticipant) return;

    // Validate character limit (1000 chars)
    if (messageContent.length > 1000) {
      setError('Message exceeds 1000 character limit');
      return;
    }

    try {
      setIsSending(true);
      setError(null);

      const newMessage = await sendMessage(
        currentUser.id,
        otherParticipant.id,
        messageContent.trim()
      );

      // Optimistic UI update
      setMessages((prevMessages) => {
        const exists = prevMessages.some(m => m.id === newMessage.id);
        if (exists) return prevMessages;
        return [...prevMessages, newMessage];
      });

      setMessageContent('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Handle textarea auto-resize
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageContent(e.target.value);
    
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // Format message timestamp
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  if (!otherParticipant) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Unable to load conversation</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {/* Back button for mobile */}
          <button
            onClick={onBack}
            className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
          >
            <Icon icon="ph:arrow-left-bold" width="20" height="20" className="text-gray-700" />
          </button>

          {/* Participant Info */}
          <img
            src={otherParticipant.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParticipant.handle}`}
            alt={otherParticipant.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm truncate">{otherParticipant.name}</span>
              {otherParticipant.verified && (
                <Icon icon="ph:seal-check-fill" className="text-green-500 flex-shrink-0" width="16" height="16" />
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">@{otherParticipant.handle}</p>
          </div>

          {/* More options */}
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Icon icon="ph:info-bold" width="20" height="20" className="text-gray-700" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Icon icon="line-md:loading-twotone-loop" width="32" height="32" className="text-nsp-teal" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Icon icon="ph:chat-circle-dots" width="64" height="64" className="text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium mb-2">No messages yet</p>
            <p className="text-sm text-gray-400">Send a message to start the conversation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isCurrentUser = message.sender_id === currentUser.id;
              const showTimestamp = index === 0 || 
                (new Date(message.created_at).getTime() - new Date(messages[index - 1].created_at).getTime()) > 300000; // 5 minutes

              return (
                <div key={message.id}>
                  {showTimestamp && (
                    <div className="text-center text-xs text-gray-400 my-4">
                      {formatMessageTime(message.created_at)}
                    </div>
                  )}
                  
                  <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`
                          px-4 py-2 rounded-2xl break-words
                          ${isCurrentUser 
                            ? 'bg-nsp-teal text-white rounded-br-sm' 
                            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                          }
                        `}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t border-gray-100 p-4">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={messageContent}
              onChange={handleTextareaChange}
              placeholder={`Message @${otherParticipant.handle}`}
              className="w-full px-4 py-3 pr-12 bg-gray-100 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-nsp-teal text-sm"
              rows={1}
              style={{ maxHeight: '120px' }}
              disabled={isSending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            
            {/* Character count */}
            <div className="absolute right-3 bottom-3 text-xs text-gray-400">
              {messageContent.length}/1000
            </div>
          </div>

          <button
            type="submit"
            disabled={!messageContent.trim() || isSending || messageContent.length > 1000}
            className={`
              p-3 rounded-full transition-all flex-shrink-0
              ${messageContent.trim() && messageContent.length <= 1000 && !isSending
                ? 'bg-nsp-teal hover:bg-nsp-dark-teal text-white' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isSending ? (
              <Icon icon="line-md:loading-twotone-loop" width="20" height="20" />
            ) : (
              <Icon icon="ph:paper-plane-tilt-fill" width="20" height="20" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MessageThread;
