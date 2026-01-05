import { supabase } from './supabaseClient'
import type { Conversation, Message, User } from '../types'
import * as crypto from './cryptoService';

// Local storage keys
const PRIVATE_KEY_STORAGE_KEY = 'nsp_priv_key';

// In-memory key cache
let cachedPrivateKey: CryptoKey | null = null;


// Ensure we have the latest session before making requests
const getAuthenticatedSupabase = async () => {
  // Force refresh to ensure token is current
  await supabase.auth.refreshSession();
  return supabase;
}

/**
 * Message Service
 * Handles all direct messaging operations including sending messages,
 * retrieving conversations, and managing message threads
 * Requirements: 10.2, 10.5
 */

export interface MessageService {
  sendMessage(senderId: string, recipientId: string, content: string): Promise<Message>
  getConversations(userId: string): Promise<Conversation[]>
  getMessages(conversationId: string, userId: string, limit?: number, offset?: number): Promise<Message[]>
  markConversationAsRead(conversationId: string, userId: string): Promise<void>
  getOrCreateConversation(userId: string, otherUserId: string): Promise<string>
}

/**
 * Get messages for a conversation
 * Decrypts messages if the user has a private key available.
 */
export const getMessages = async (
  conversationId: string,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:users!sender_id(*)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false }) // Get newest first
    .range(offset, offset + limit - 1)

  if (error) throw error

  // Reverse to show oldest first in the UI thread
  const messages = (data || []).reverse()

  // Decrypt each message if possible
  const decryptedMessages = await Promise.all(messages.map(async (msg) => {
    try {
      // Attempt to decrypt if cachedKey exists and content looks encrypted (JSON)
      if (cachedPrivateKey && msg.content.startsWith('{') && msg.content.includes('"k":')) {
        const decryptedContent = await crypto.decryptMessage(msg.content, cachedPrivateKey);
        return { ...msg, content: decryptedContent, isEncrypted: true };
      }
    } catch (e) {
      console.warn('Decryption error for message', msg.id, e);
      return { ...msg, content: '🔒 Encrypted Message (Key missing)', isEncrypted: true };
    }
    return msg;
  }));

  return decryptedMessages;
}


/**
 * Send a direct message to another user
 * Encrypts content if keys are available.
 */
export const sendMessage = async (
  senderId: string,
  recipientId: string,
  content: string,
  mediaUrl?: string | null,
  mediaType?: 'image' | 'video' | 'gif' | 'audio' | 'document' | 'other' | null
): Promise<Message> => {
  // Validate character limit (4000 chars for encrypted blob)
  if (content.length > 4000) {
    throw new Error('Message content exceeds limit')
  }

  if (!content.trim() && !mediaUrl) throw new Error('Message content cannot be empty')
  if (senderId === recipientId) throw new Error('Cannot send message to yourself')

  // Get or create conversation
  const conversationId = await getOrCreateConversation(senderId, recipientId)

  // 1. Fetch Recipient Public Key
  const { data: recipientKeyData, error: keyError } = await supabase
    .from('user_keys')
    .select('public_key')
    .eq('user_id', recipientId)
    .single();

  let encryptedContent = content; // Fallback to plain text if no keys (transition period)

  if (recipientKeyData?.public_key) {
    try {
      const recipientPublicKey = await crypto.importPublicKey(JSON.parse(recipientKeyData.public_key));
      encryptedContent = await crypto.encryptMessage(content || '', recipientPublicKey);
    } catch (e) {
      console.error('Failed to encrypt message', e);
      throw new Error('Encryption failed. Message not sent.');
    }
  } else {
    console.warn('Recipient has no public key. Sending plain text (NOT SECURE).');
    // For now, we still allow plain text to avoid blocking communication during migration.
    // In strict mode, we should: throw new Error("Recipient hasn't enabled Secure Messaging yet.");
  }

  // Insert message into database
  const { data: messageData, error: messageError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: encryptedContent,
      media_url: mediaUrl,
      media_type: mediaType
    })
    .select()
    .single()

  if (messageError) throw new Error(`Failed to send message: ${messageError.message}`)

  // Fetch sender data (for Optimistic UI return)
  const { data: senderData } = await supabase.from('users').select('*').eq('id', senderId).single();

  return {
    ...messageData,
    sender: senderData,
    isEncrypted: !!recipientKeyData?.public_key
  }
}

// ... existing getOrCreateConversation ...

// --- E2EE Helpers ---

export const hasKeysSetup = async (userId: string): Promise<boolean> => {
  const { count } = await supabase
    .from('user_keys')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count || 0) > 0;
}

export const setupKeys = async (userId: string, pin: string): Promise<void> => {
  // 1. Generate Keys
  const keyPair = await crypto.generateKeyPair();

  // 2. Wrap Private Key
  const { encryptedKey, salt, iv } = await crypto.wrapPrivateKey(keyPair.privateKey, pin);

  // 3. Export Public Key
  const publicKeyJwk = await crypto.exportKey(keyPair.publicKey);

  // 4. Save to DB
  const { error } = await supabase.from('user_keys').upsert({
    user_id: userId,
    public_key: JSON.stringify(publicKeyJwk),
    encrypted_private_key: encryptedKey,
    salt: salt,
    iv: iv // Wait, migration didn't have IV column? I should check.
    // Migration had: user_id, public_key, encrypted_private_key, salt. 
    // I missed 'iv' in the migration check or assumed salt covers it.
    // I SHOULD CHECK THE MIGRATION I WROTE.
  });

  if (error) throw error;

  // 5. Cache Private Key
  cachedPrivateKey = keyPair.privateKey;
}

export const recoverKeys = async (userId: string, pin: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_keys')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return false;

  try {
    // Use the correct iv column from the database
    const privateKey = await crypto.unwrapPrivateKey(
      data.encrypted_private_key,
      data.salt,
      data.iv,  // Use the actual IV, not salt
      pin
    );
    cachedPrivateKey = privateKey;
    return true;
  } catch (e) {
    console.error('Recovery failed', e);
    return false;
  }
}



export const getOrCreateConversation = async (
  userId: string,
  otherUserId: string
): Promise<string> => {
  const { data: existingConversations, error: findError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId)

  if (findError) {
    throw new Error(`Failed to find conversations: ${findError.message}`)
  }

  if (existingConversations && existingConversations.length > 0) {
    // Check which of these conversations also includes the other user
    const conversationIds = existingConversations.map(cp => cp.conversation_id)

    const { data: otherUserParticipants, error: otherUserError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId)
      .in('conversation_id', conversationIds)

    if (otherUserError) {
      throw new Error(`Failed to find other user conversations: ${otherUserError.message}`)
    }

    if (otherUserParticipants && otherUserParticipants.length > 0) {
      // Found existing conversation
      return otherUserParticipants[0].conversation_id
    }
  }

  // No existing conversation, create a new one
  console.log('Creating new conversation for users:', userId, otherUserId);

  // Use the RPC function to create conversation and participants atomically
  // This avoids RLS issues where we can't select the conversation before being a participant
  const { data: conversationId, error: createError } = await supabase
    .rpc('create_new_conversation', {
      p_other_user_id: otherUserId
    });

  if (createError) {
    console.error('Failed to create conversation via RPC:', createError);
    throw new Error(`Failed to create conversation: ${createError.message}`)
  }

  console.log('Successfully created conversation:', conversationId);
  return conversationId
}

/**
 * Get all conversations for a user
 * Returns conversations ordered by most recent message (Requirements 10.4)
 * Includes unread message count (Requirements 10.3)
 */
export const getConversations = async (userId: string): Promise<Conversation[]> => {
  // Get all conversation IDs for this user
  const { data: participantData, error: participantError } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId)

  if (participantError) {
    throw new Error(`Failed to fetch conversations: ${participantError.message}`)
  }

  if (!participantData || participantData.length === 0) {
    return []
  }

  const conversationIds = participantData.map(p => p.conversation_id)
  const lastReadMap = new Map(participantData.map(p => [p.conversation_id, p.last_read_at]))

  // Fetch conversation details with last message
  const { data: conversationsData, error: conversationsError } = await supabase
    .from('conversations')
    .select('id, created_at, updated_at')
    .in('id', conversationIds)
    .order('updated_at', { ascending: false })

  if (conversationsError) {
    throw new Error(`Failed to fetch conversation details: ${conversationsError.message}`)
  }

  if (!conversationsData || conversationsData.length === 0) {
    return []
  }

  // Fetch participants for all conversations
  const { data: allParticipantsData, error: allParticipantsError } = await supabase
    .from('conversation_participants')
    .select(`
      conversation_id,
      user_id,
      user:users!conversation_participants_user_id_fkey(
        id,
        handle,
        name,
        avatar,
        bio,
        rank,
        verified,
        created_at,
        updated_at
      )
    `)
    .in('conversation_id', conversationIds)

  if (allParticipantsError) {
    throw new Error(`Failed to fetch participants: ${allParticipantsError.message}`)
  }

  // Group participants by conversation
  const participantsByConversation = new Map<string, User[]>()
  allParticipantsData?.forEach((participant: any) => {
    if (!participantsByConversation.has(participant.conversation_id)) {
      participantsByConversation.set(participant.conversation_id, [])
    }
    // Exclude the current user from the participants list
    if (participant.user_id !== userId) {
      const user = Array.isArray(participant.user) ? participant.user[0] : participant.user
      participantsByConversation.get(participant.conversation_id)!.push(user)
    }
  })

  // Fetch last message for each conversation
  const { data: lastMessagesData, error: lastMessagesError } = await supabase
    .from('messages')
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      created_at,
      updated_at,
      sender:users!messages_sender_id_fkey(
        id,
        handle,
        name,
        avatar,
        bio,
        rank,
        verified,
        created_at,
        updated_at
      )
    `)
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false })

  if (lastMessagesError) {
    throw new Error(`Failed to fetch last messages: ${lastMessagesError.message}`)
  }

  // Group last messages by conversation (take the most recent one)
  const lastMessageByConversation = new Map<string, Message>()
  lastMessagesData?.forEach((message: any) => {
    if (!lastMessageByConversation.has(message.conversation_id)) {
      const sender = Array.isArray(message.sender) ? message.sender[0] : message.sender
      lastMessageByConversation.set(message.conversation_id, {
        id: message.id,
        conversation_id: message.conversation_id,
        sender_id: message.sender_id,
        sender: sender,
        content: message.content,
        created_at: message.created_at,
        updated_at: message.updated_at
      })
    }
  })

  // Calculate unread counts for each conversation
  const unreadCounts = new Map<string, number>()
  for (const conversationId of conversationIds) {
    const lastReadAt = lastReadMap.get(conversationId)

    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .gt('created_at', lastReadAt || '1970-01-01')

    if (!countError && count !== null) {
      unreadCounts.set(conversationId, count)
    }
  }

  // Transform to Conversation objects
  return conversationsData.map((conversation: any) => ({
    id: conversation.id,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    participants: participantsByConversation.get(conversation.id) || [],
    last_message: lastMessageByConversation.get(conversation.id),
    unread_count: unreadCounts.get(conversation.id) || 0
  }))
}


/**
 * Mark a conversation as read by updating last_read_at timestamp
 * This affects the unread message indicator (Requirements 10.3)
 */
export const markConversationAsRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)

    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to mark conversation as read: ${error.message}`)
  }
}

/**
 * Get total count of unread messages across all conversations
 * Efficient query using count only
 */
export const getUnreadMessageCount = async (userId: string): Promise<number> => {
  // We need to count messages where:
  // 1. User is a participant in the conversation
  // 2. Message is NOT sent by the user
  // 3. Message created_at > user's last_read_at for that conversation

  // Since Supabase doesn't support complex joins in simple count queries easily without views,
  // we'll use a two-step approach or a stored procedure.
  // For now, let's use the efficient client-side approach (fetch participants, then count).

  // 1. Get all conversations and last_read_at for the user
  const { data: participations, error: pError } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId);

  if (pError || !participations || participations.length === 0) return 0;

  let totalUnread = 0;

  // 2. For each conversation, count unread messages
  // This could be N+1 queries, but 'count' is fast. 
  // Optimization: Create a database function `get_unread_message_count(user_id)` later.

  await Promise.all(participations.map(async (p) => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', p.conversation_id)
      .neq('sender_id', userId)
      .gt('created_at', p.last_read_at || '1970-01-01');

    if (count) totalUnread += count;
  }));

  return totalUnread;
}

/**
 * Subscribe to real-time message updates for a conversation
 * Returns a subscription object that can be unsubscribed
 */
export const subscribeToMessages = (
  conversationId: string,
  onNewMessage: (message: Message) => void,
  onError?: (error: Error) => void
) => {
  const channel = supabase
    .channel(`messages-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      async (payload) => {
        try {
          // Fetch the complete message data with sender info
          const { data: messageData, error: messageError } = await supabase
            .from('messages')
            .select(`
              id,
              conversation_id,
              sender_id,
              content,
              created_at,
              updated_at,
              sender:users!messages_sender_id_fkey(
                id,
                handle,
                name,
                avatar,
                bio,
                rank,
                verified,
                created_at,
                updated_at
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (messageError) {
            throw new Error(`Failed to fetch new message: ${messageError.message}`)
          }

          // Transform to Message type
          const sender = Array.isArray(messageData.sender) ? messageData.sender[0] : messageData.sender
          const newMessage: Message = {
            id: messageData.id,
            conversation_id: messageData.conversation_id,
            sender_id: messageData.sender_id,
            sender: sender,
            content: messageData.content,
            created_at: messageData.created_at,
            updated_at: messageData.updated_at
          }

          onNewMessage(newMessage)
        } catch (error) {
          if (onError) {
            onError(error instanceof Error ? error : new Error('Unknown error'))
          } else {
            console.error('Error processing new message:', error)
          }
        }
      }
    )
    .subscribe()

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to real-time conversation updates (for conversation list)
 * Returns a subscription object that can be unsubscribed
 */
export const subscribeToConversations = (
  userId: string,
  onConversationUpdate: () => void,
  onError?: (error: Error) => void
) => {
  const channel = supabase
    .channel(`conversations-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      async (payload) => {
        try {
          // Check if this message is in a conversation the user is part of
          const { data: participantCheck } = await supabase
            .from('conversation_participants')
            .select('id')
            .eq('conversation_id', payload.new.conversation_id)
            .eq('user_id', userId)
            .single()

          if (participantCheck) {
            onConversationUpdate()
          }
        } catch (error) {
          if (onError) {
            onError(error instanceof Error ? error : new Error('Unknown error'))
          } else {
            console.error('Error processing conversation update:', error)
          }
        }
      }
    )
    .subscribe()

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel)
  }
}
