import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import SocialLayout from '../Layout/SocialLayout';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import ConversationList from '../Messaging/ConversationList';
import MessageThread from '../Messaging/MessageThread';
import NewMessageModal from '../Messaging/NewMessageModal';
import EncryptionSetupModal from '../Messaging/EncryptionSetupModal';
import EncryptionUnlockModal from '../Messaging/EncryptionUnlockModal';
import { Conversation } from '../../types';
import { getConversations, subscribeToConversations, getOrCreateConversation, hasKeysSetup } from '../../services/messageService';
import { getUserById } from '../../services/userService';
// import { useNotification } from '../../contexts/NotificationContext';

/**
 * Messages Page Component
 * Main messaging interface with conversation list and message thread
 * Requirements: 10.1, 10.3, 10.4
 */
const Messages: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParams = new URLSearchParams(location.search);
  const newConversationUserId = queryParams.get('user');

  const { profile: currentUser, loading: userLoading } = useCurrentUser();
  // const { unreadCount, markAsRead } = useNotification(); // Uncomment if useNotification is available

  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);

  // E2EE State
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [isKeysReady, setIsKeysReady] = useState(false);

  // Check E2EE Status on mount
  useEffect(() => {
    if (!currentUser) return;

    const checkSecurity = async () => {
      try {
        const hasKeys = await hasKeysSetup(currentUser.id);
        if (!hasKeys) {
          setShowSetupModal(true);
        } else {
          // If keys exist, check if we need to unlock (cachedPrivateKey is checked in service,
          // but effectively we just force unlock modal if we can't read messages?
          // Simpler: Just ask to unlock on every fresh load for now as we don't persist key in localStorage yet for security).
          // Wait, if I reload, I lose the key. So I must unlock.
          setShowUnlockModal(true);
          // Optimization: We could check if cachedPrivateKey is set in service if we expose a checker.
          // For now, assume "Show Unlock" is safer.
        }
      } catch (e) {
        console.error('Security check failed', e);
      }
    };

    checkSecurity();
  }, [currentUser]);

  const handleSecuritySuccess = () => {
    setShowSetupModal(false);
    setShowUnlockModal(false);
    setIsKeysReady(true);
  };

  // Fetch conversations on mount
  useEffect(() => {
    const fetchConversations = async () => {
      if (!currentUser) return;

      try {
        // setLoading(true); // Already initialized as true
        const fetchedConversations = await getConversations(currentUser.id);
        setConversations(fetchedConversations);
        setError(null);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [currentUser]);

  // Handle user query parameter to start a conversation
  useEffect(() => {
    const handleUserParam = async () => {
      const targetUserId = searchParams.get('user');
      if (!targetUserId || !currentUser || isNewMessageModalOpen) return;

      // Debug authentication
      console.log('Current user for conversation creation:', currentUser);

      try {
        // setLoading(true);

        // Get or create conversation with the target user
        const conversationId = await getOrCreateConversation(currentUser.id, targetUserId);

        // Select the conversation
        setActiveConversationId(conversationId);

        // Refresh conversations list to include the new/existing conversation
        const updatedConversations = await getConversations(currentUser.id);
        setConversations(updatedConversations);

        // Clear the query parameter
        setSearchParams({});
      } catch (err) {
        console.error('Error creating conversation:', err);
        setError(`Failed to start conversation: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        // setLoading(false);
      }
    };

    handleUserParam();
  }, [searchParams, currentUser, isNewMessageModalOpen, setSearchParams]);

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
  if (userLoading || loading) {
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

  const selectedConversation = conversations.find(c => c.id === activeConversationId);

  return (
    <SocialLayout showWidgets={false} fullWidth={true} hideBottomNav={!!activeConversationId}>
      <div className="h-[calc(100vh)] md:h-[100vh] flex flex-col md:flex-row overflow-hidden bg-white">

        {/* Conversation List - Left Panel */}
        {/* On mobile: visible if no active conversation */}
        {/* On desktop: always visible (w-[400px]) */}
        <div className={`${activeConversationId ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] lg:w-[400px] border-r border-gray-100 flex-col h-full bg-white`}>
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-4 border-b border-gray-100 flex-shrink-0 min-h-[53px] flex items-center">
            <div className="flex items-center justify-between w-full">
              <h2 className="font-bold text-xl text-gray-900">Messages</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate('/settings')}
                  className="p-2 hover:bg-black/5 rounded-full transition-colors"
                  title="Settings"
                >
                  <Icon icon="ph:gear-bold" width="20" height="20" className="text-gray-900" />
                </button>
                <button
                  onClick={() => setIsNewMessageModalOpen(true)}
                  className="p-2 hover:bg-black/5 rounded-full transition-colors"
                  title="New Message"
                >
                  <Icon icon="ph:note-pencil-bold" width="20" height="20" className="text-gray-900" />
                </button>
              </div>
            </div>
          </div>

          {/* Conversation List */}
          <ConversationList
            conversations={conversations}
            selectedConversationId={activeConversationId}
            onSelectConversation={setActiveConversationId}
            currentUserId={currentUser.id}
          />
        </div>

        {/* Message Thread - Right Panel */}
        {/* On mobile: visible if active conversation */}
        {/* On desktop: always visible (flex-1) */}
        <div className={`${activeConversationId ? 'flex' : 'hidden md:flex'} flex-1 flex-col h-full bg-white relative`}>
          {selectedConversation ? (
            <MessageThread
              conversation={selectedConversation}
              currentUser={currentUser}
              onBack={() => setActiveConversationId(null)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
              <div className="max-w-[400px] w-full text-left">
                <h3 className="text-[31px] leading-[36px] font-black text-gray-900 mb-2">Select a message</h3>
                <p className="text-[15px] text-gray-500 mb-7 leading-normal">
                  Choose from your existing conversations, start a new one, or get verified to message others.
                </p>
                <button
                  onClick={() => setIsNewMessageModalOpen(true)}
                  className="bg-nsp-teal hover:bg-nsp-dark-teal text-white font-bold text-[15px] px-8 py-3 rounded-full transition-all shadow-sm hover:shadow-md h-[52px]"
                >
                  New message
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      <NewMessageModal
        isOpen={isNewMessageModalOpen}
        onClose={() => setIsNewMessageModalOpen(false)}
        currentUser={currentUser}
      />
    </SocialLayout>
  );
};

export default Messages;

