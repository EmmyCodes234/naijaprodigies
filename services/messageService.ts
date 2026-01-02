import { supabase } from './supabaseClient'
import type { Conversation, Message, User } from '../types'

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
 * Send a direct message to another user
 * Creates a conversation if one doesn't exist between the two users
 * Validates character limit (1000 chars) per Requirements 10.5
 */
export const sendMessage = async (
  senderId: string,
  recipientId: string,
  content: string
): Promise<Message> => {
  // Validate character limit (1000 chars)
  if (content.length > 1000) {
    throw new Error('Message content exceeds 1000 character limit')
  }

  // Validate content is not empty
  if (!content.trim()) {
    throw new Error('Message content cannot be empty')
  }

  // Validate sender and recipient are different
  if (senderId === recipientId) {
    throw new Error('Cannot send message to yourself')
  }

  // Get or create conversation between the two users
  const conversationId = await getOrCreateConversation(senderId, recipientId)

  // Insert message into database
  const { data: messageData, error: messageError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim()
    })
    .select()
    .single()

  if (messageError) {
    throw new Error(`Failed to send message: ${messageError.message}`)
  }

  // Fetch the sender data
  const { data: senderData, error: senderError } = await supabase
    .from('users')
    .select('*')
    .eq('id', senderId)
    .single()

  if (senderError) {
    throw new Error(`Failed to fetch sender data: ${senderError.message}`)
  }

  // Return the complete message object
  return {
    id: messageData.id,
    conversation_id: messageData.conversation_id,
    sender_id: messageData.sender_id,
    sender: senderData,
    content: messageData.content,
    created_at: messageData.created_at,
    updated_at: messageData.updated_at
  }
}

/**
 * Get or create a conversation between two users
 * Returns the conversation ID
 */
export const getOrCreateConversation = async (
  userId: string,
  otherUserId: string
): Promise<string> => {
  // Find existing conversation between the two users
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
 * Get messages for a specific conversation
 * Returns messages in chronological order (oldest first)
 */
export const getMessages = async (
  conversationId: string,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Message[]> => {
  // Verify user is a participant in this conversation
  const { data: participantCheck, error: participantError } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single()

  if (participantError || !participantCheck) {
    throw new Error('User is not a participant in this conversation')
  }

  // Fetch messages with sender data
  const { data: messagesData, error: messagesError } = await supabase
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
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (messagesError) {
    throw new Error(`Failed to fetch messages: ${messagesError.message}`)
  }

  if (!messagesData || messagesData.length === 0) {
    return []
  }

  // Transform to Message objects
  return messagesData.map((message: any) => {
    const sender = Array.isArray(message.sender) ? message.sender[0] : message.sender
    return {
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      sender: sender,
      content: message.content,
      created_at: message.created_at,
      updated_at: message.updated_at
    }
  })
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

  if (error) {
    throw new Error(`Failed to mark conversation as read: ${error.message}`)
  }
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
