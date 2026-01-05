import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { Conversation, Message, User } from '../../types';
import { getMessages, sendMessage, markConversationAsRead, subscribeToMessages } from '../../services/messageService';
import { format, isToday, isYesterday } from 'date-fns';
import Avatar from '../Shared/Avatar';
import VerifiedBadge from '../Shared/VerifiedBadge';
import { uploadImages } from '../../services/imageService';
import { uploadFile, getFileType } from '../../services/fileService';
import EmojiPicker, { EmojiClickData, EmojiStyle } from 'emoji-picker-react';
import GifPicker from '../Shared/GifPicker';
import { GifResult } from '../../services/gifService';

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
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const otherParticipant = conversation.participants?.find((p: User) => p.id !== currentUser.id) || conversation.participants?.[0] || currentUser;

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

  // Handlers for dynamic features
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessageContent(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleGifSelect = (gif: GifResult) => {
    setSelectedGif(gif.url);
    setMediaPreview(gif.url);
    setShowGifPicker(false);
    setSelectedMedia(null);
  };

  /* 
   * Handle generic file selection
   * Supports Images, Video, Audio, Docs
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedMedia(file);

      // Generate preview based on type
      const type = getFileType(file.type);
      if (type === 'image') {
        setMediaPreview(URL.createObjectURL(file));
      } else {
        // For non-images, we don't show a visual preview, just an icon or name
        setMediaPreview(null);
      }

      setSelectedGif(null);
    }
  };

  const removeMedia = () => {
    setSelectedMedia(null);
    setSelectedGif(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
      setError(null);
      setIsSending(true);

      let mediaUrl = selectedGif;
      let mediaType: 'image' | 'video' | 'gif' | 'audio' | 'document' | 'other' | null = selectedGif ? 'gif' : null;

      // Handle file upload if media is selected
      if (selectedMedia) {
        setIsUploading(true);
        try {
          // New generic file upload
          const result = await uploadFile(selectedMedia, 'message-attachments', currentUser.id);
          mediaUrl = result.url;
          mediaType = result.type;
        } catch (uploadErr) {
          console.error('Upload failed:', uploadErr);
          setError('Failed to upload file');
          setIsUploading(false);
          setIsSending(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      // Create optimistic message
      const optimisticMessage: Message = {
        id: `optimistic-${Date.now()}`,
        conversation_id: conversation.id,
        sender_id: currentUser.id,
        content: messageContent.trim(),
        media_url: mediaUrl,
        media_type: mediaType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: currentUser,
        isOptimistic: true
      };

      // Push to UI immediately
      setMessages((prev) => [...prev, optimisticMessage]);
      setMessageContent('');
      removeMedia();

      // Reset height
      if (inputRef.current) {
        inputRef.current.style.height = '38px';
      }

      // Send to server
      const newMessage = await sendMessage(
        currentUser.id,
        otherParticipant.id,
        optimisticMessage.content,
        mediaUrl,
        mediaType
      );

      // Replace optimistic message with real one
      setMessages((prev) => prev.map(m => m.id === optimisticMessage.id ? newMessage : m));
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages((prev) => prev.filter(m => !m.id.startsWith('optimistic-')));
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
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-4 border-b border-gray-100 min-h-[53px] flex items-center">
        <div className="flex items-center gap-3 w-full">
          {/* Back button for mobile */}
          <button
            onClick={onBack}
            className="md:hidden p-2 hover:bg-black/5 rounded-full transition-colors mr-1"
          >
            <Icon icon="ph:arrow-left-bold" width="20" height="20" className="text-gray-900" />
          </button>

          {/* Participant Info */}
          <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
            <Avatar
              user={otherParticipant}
              alt={otherParticipant?.name || 'User'}
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-[15px] leading-tight truncate text-gray-900">
                  {otherParticipant?.name || 'User'}
                </span>
                {otherParticipant && <VerifiedBadge user={otherParticipant} size={14} />}
              </div>
              <p className="text-[13px] text-gray-500 leading-tight truncate">
                @{otherParticipant?.handle || 'unknown'}
              </p>
            </div>
          </div>

          {/* More options */}
          <button className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <Icon icon="ph:info-bold" width="20" height="20" className="text-gray-900" />
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
                    <div className="flex justify-center my-6">
                      <div className="px-3 py-1 text-[13px] text-gray-500 border-b border-transparent hover:bg-black/5 rounded-full cursor-default select-none transition-colors">
                        {formatMessageTime(message.created_at)}
                      </div>
                    </div>
                  )}

                  <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`
                            px-4 py-2 rounded-[20px] break-words
                            ${isCurrentUser
                            ? 'bg-nsp-teal text-white rounded-br-[4px]'
                            : 'bg-black/5 text-gray-900 rounded-bl-[4px]'
                          }
                          `}
                      >
                        {message.media_url && (
                          <div className="mb-2 max-w-full overflow-hidden rounded-lg">
                            {message.media_type === 'gif' || message.media_url.endsWith('.gif') ? (
                              <img
                                src={message.media_url}
                                alt="GIF"
                                className="w-full h-auto object-cover max-h-[300px]"
                                loading="lazy"
                              />
                            ) : message.media_type === 'image' || (message.media_url.match(/\.(jpeg|jpg|png|webp)$/i) && message.media_type !== 'audio' && message.media_type !== 'document') ? (
                              <img
                                src={message.media_url}
                                alt="Shared media"
                                className="w-full h-auto object-cover max-h-[300px]"
                                loading="lazy"
                              />
                            ) : message.media_type === 'audio' ? (
                              <div className="min-w-[200px] p-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <Icon icon="ph:waveform-bold" className="text-nsp-teal" width="20" />
                                  <span className="text-xs font-semibold opacity-70">Voice/Audio</span>
                                </div>
                                <audio controls className="w-full max-w-[240px] h-[32px]">
                                  <source src={message.media_url} />
                                  Your browser does not support audio.
                                </audio>
                              </div>
                            ) : message.media_type === 'document' ? (
                              <a
                                href={message.media_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-black/5 hover:bg-black/10 rounded-lg transition-colors group min-w-[200px]"
                              >
                                <div className="p-2 bg-white rounded-md shadow-sm">
                                  <Icon icon="ph:file-pdf-bold" className="text-red-500" width="24" />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                  <span className="text-sm font-medium truncate max-w-[150px] group-hover:underline">
                                    Document
                                  </span>
                                  <span className="text-[10px] uppercase text-gray-500 font-bold">Download</span>
                                </div>
                              </a>
                            ) : null}
                          </div>
                        )}
                        <p className="text-[15px] leading-normal whitespace-pre-wrap">{message.content}</p>
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

      {/* Message Input Area */}
      <div className="border-t border-gray-100 p-3 relative">
        {/* Media Preview */}
        {mediaPreview && (
          <div className="absolute bottom-full left-4 mb-2 p-2 bg-white rounded-xl shadow-lg border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="relative">
              <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-100 min-w-[150px]">
                {mediaPreview ? (
                  <img
                    src={mediaPreview}
                    alt="Selected media"
                    className="max-h-[120px] rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Icon icon="ph:file-arrow-up-bold" width="32" />
                    <span className="text-xs font-medium max-w-[100px] truncate">{selectedMedia?.name}</span>
                  </div>
                )}
              </div>
              <button
                onClick={removeMedia}
                className="absolute -top-2 -right-2 bg-black/75 hover:bg-black/90 text-white rounded-full p-1 shadow-md transition-all"
              >
                <Icon icon="ph:x-bold" width="14" height="14" />
              </button>
            </div>
            {isUploading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
                <Icon icon="line-md:loading-twotone-loop" width="24" height="24" className="text-nsp-teal" />
              </div>
            )}
          </div>
        )}

        {/* Picker Modals */}
        {showEmojiPicker && (
          <div className="absolute bottom-full right-4 mb-2 z-[100]">
            <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
            <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                autoFocusSearch={false}
                emojiStyle={EmojiStyle.NATIVE}
                lazyLoadEmojis={true}
              />
            </div>
          </div>
        )}

        {showGifPicker && (
          <div className="absolute bottom-full left-4 mb-2 z-[100] w-[320px]">
            <div className="fixed inset-0" onClick={() => setShowGifPicker(false)} />
            <div className="relative">
              <GifPicker
                onSelect={handleGifSelect}
                onClose={() => setShowGifPicker(false)}
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end gap-1">
          {/* Action Icons */}
          <div className="flex items-center gap-0.5 mb-1 mr-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-nsp-teal hover:bg-nsp-teal/10 rounded-full transition-colors"
              title="Attach File"
              disabled={isSending}
            >
              <Icon icon="ph:paperclip-bold" width="20" height="20" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowGifPicker(!showGifPicker);
                setShowEmojiPicker(false);
              }}
              className={`p-2 rounded-full transition-colors ${showGifPicker ? 'text-nsp-teal bg-nsp-teal/10' : 'text-nsp-teal hover:bg-nsp-teal/10'}`}
              title="GIF"
              disabled={isSending}
            >
              <Icon icon="ph:gif-bold" width="20" height="20" />
            </button>
          </div>

          <div className="flex-1 flex items-center bg-[#eff3f4] rounded-[22px] min-h-[38px] px-4 py-1.5 focus-within:bg-white focus-within:ring-1 focus-within:ring-nsp-teal transition-all">
            <textarea
              ref={inputRef}
              value={messageContent}
              onChange={handleTextareaChange}
              placeholder={`Start a new message`}
              className="flex-1 bg-transparent resize-none border-none outline-none focus:ring-0 text-[15px] py-1 placeholder-gray-500 leading-normal text-black"
              rows={1}
              style={{ maxHeight: '120px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />

            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowGifPicker(false);
              }}
              className={`p-1.5 rounded-full transition-colors ${showEmojiPicker ? 'text-nsp-teal bg-nsp-teal/10' : 'text-nsp-teal hover:bg-nsp-teal/10'}`}
              title="Emoji"
              disabled={isSending}
            >
              <Icon icon="ph:smiley-bold" width="20" height="20" />
            </button>
          </div>

          <button
            type="submit"
            disabled={(!messageContent.trim() && !selectedMedia && !selectedGif) || isSending || messageContent.length > 1000}
            className={`
              p-2 rounded-full transition-all flex-shrink-0 mb-0.5 ml-1
              ${(messageContent.trim() || selectedMedia || selectedGif) && messageContent.length <= 1000 && !isSending
                ? 'text-nsp-teal hover:bg-nsp-teal/10 cursor-pointer'
                : 'text-nsp-teal/30 cursor-not-allowed'
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
