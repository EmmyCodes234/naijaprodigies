export interface NavLink {
  label: string;
  href: string;
}

export interface WordWizardState {
  isOpen: boolean;
  input: string;
  result: string | null;
  loading: boolean;
  error: string | null;
}

// Database models matching Supabase schema
export interface User {
  id: string;
  handle: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  rank: string | null;
  verified: boolean;
  verification_type?: 'none' | 'green' | 'gold' | 'grey';
  cover_url?: string | null;
  website?: string | null;
  location?: string | null;
  birth_date?: string | null;
  onboarding_completed?: boolean;
  created_at: string;
  updated_at: string;
  following_count?: number;
  followers_count?: number;
}

export interface Post {
  id: string;
  user_id: string;
  user: User;
  content: string;
  images: string[];
  likes_count: number;
  comments_count: number;
  reracks_count: number;
  created_at: string;
  is_rerack: boolean;
  original_post?: Post;
  quote_text?: string;
  is_liked_by_current_user?: boolean;
  scheduled_for?: string | null;
  poll_id?: string | null;
  media_type?: 'image' | 'video' | 'gif';
  is_saved_by_current_user?: boolean;
  impressions_count: number;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  user: User;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  replies?: Comment[];
  media_url?: string;
  media_type?: 'image' | 'video' | 'gif';
}

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

// Direct Messaging types
export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants?: User[];
  last_message?: Message;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: User;
  content: string;
  media_url?: string | null;
  media_type?: 'image' | 'video' | 'gif' | 'audio' | 'document' | 'other' | null;
  created_at: string;
  updated_at: string;
  isOptimistic?: boolean;
}

// Notifications types
export type NotificationType = 'like' | 'comment' | 'follow' | 'rerack' | 'mention';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string;
  actor?: User;
  post_id: string | null;
  post?: Post;
  comment_id: string | null;
  comment?: Comment;
  is_read: boolean;
  created_at: string;
}