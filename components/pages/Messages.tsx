import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import ConversationList from '../Messaging/ConversationList';
import MessageThread from '../Messaging/MessageThread';
import { Conversation } from '../../types';
import { getConversations, subscribeToConversations, getOrCreateConversation } from '../../services/messageService';
import { getUserById } from '../../services/userService';

/**
 * Messages Page Component
 * Main messaging interface with conversation list and message thread
 * Requirements: 10.1, 10.3, 10.4
 */
const Messages: React.FC = () => {
  const { profile: currentUser, loading: userLoading } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // Fetch conversations on mount
  useEffect(() => {
    const fetchConversations = async () => {
      if (!currentUser) return;

      try {
        setIsLoadingConversations(true);
        const fetchedConversations = await getConversations(currentUser.id);
        setConversations(fetchedConversations);
        setError(null);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError('Failed to load conversations');
      } finally {
        setIsLoadingConversations(false);
      }
    };

    fetchConversations();
  }, [currentUser]);

  // Handle user query parameter to start a conversation
  useEffect(() => {
    const handleUserParam = async () => {
      const targetUserId = searchParams.get('user');
      if (!targetUserId || !currentUser || isCreatingConversation) return;
      
      // Debug authentication
      console.log('Current user for conversation creation:', currentUser);

      try {
        setIsCreatingConversation(true);
        
        // Get or create conversation with the target user
        const conversationId = await getOrCreateConversation(currentUser.id, targetUserId);
        
        // Select the conversation
        setSelectedConversationId(conversationId);
        
        // Refresh conversations list to include the new/existing conversation
        const updatedConversations = await getConversations(currentUser.id);
        setConversations(updatedConversations);
        
        // Clear the query parameter
        setSearchParams({});
      } catch (err) {
        console.error('Error creating conversation:', err);
        setError(`Failed to start conversation: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsCreatingConversation(false);
      }
    };

    handleUserParam();
  }, [searchParams, currentUser, isCreatingConversation, setSearchParams]);

  // Subscribe to real-time conversation updates
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToConversations(
      currentUser.id,
      async () => {
        // Refresh conversations when a new message arrives
        try {
          const updatedConversations = await getConversations(currentUser.id);
          setConversations(updatedConversations);
        } catch (err) {
          console.error('Error refreshing conversations:', err);
        }
      },
      (error) => {
        console.error('Real-time conversation subscription error:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Calculate total unread count for indicator
  const totalUnreadCount = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);

  // Show loading state
  if (userLoading || isLoadingConversations) {
    return (
      <div className="bg-white min-h-screen pt-[72px] md:pt-20 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="line-md:loading-twotone-loop" width="48" height="48" className="text-nsp-teal mx-auto mb-4" />
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-white min-h-screen pt-[72px] md:pt-20 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="ph:warning-circle" width="48" height="48" className="text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 bg-nsp-teal text-white rounded-full hover:bg-nsp-dark-teal transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show auth required state
  if (!currentUser) {
    return (
      <div className="bg-white min-h-screen pt-[72px] md:pt-20 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="ph:user-circle" width="48" height="48" className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Please sign in to view messages</p>
        </div>
      </div>
    );
  }

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  return (
    <div className="bg-white min-h-screen pt-[72px] md:pt-20">
      <div className="max-w-[1265px] mx-auto h-[calc(100vh-72px)] md:h-[calc(100vh-80px)]">
        <div className="flex h-full border-x border-gray-100">
          
          {/* Conversation List - Left Panel */}
          <div className={`${selectedConversationId ? 'hidden md:block' : 'block'} w-full md:w-[400px] border-r border-gray-100 flex flex-col`}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-xl text-gray-900">Messages</h2>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Icon icon="ph:gear-bold" width="20" height="20" className="text-gray-700" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Icon icon="ph:note-pencil-bold" width="20" height="20" className="text-gray-700" />
                  </button>
                </div>
              </div>
            </div>

            {/* Conversation List */}
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
              currentUserId={currentUser.id}
            />
          </div>

          {/* Message Thread - Right Panel */}
          <div className={`${selectedConversationId ? 'block' : 'hidden md:block'} flex-1 flex flex-col`}>
            {selectedConversation ? (
              <MessageThread
                conversation={selectedConversation}
                currentUser={currentUser}
                onBack={() => setSelectedConversationId(null)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md px-8">
                  <div className="mb-6">
                    <Icon icon="ph:envelope-simple" width="80" height="80" className="text-gray-300 mx-auto" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Select a message</h3>
                  <p className="text-gray-500">
                    Choose from your existing conversations, or start a new one.
                  </p>
                  <button className="mt-6 px-6 py-3 bg-nsp-teal hover:bg-nsp-dark-teal text-white font-bold rounded-full transition-colors">
                    New message
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Messages;
