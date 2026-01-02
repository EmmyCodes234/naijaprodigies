import { supabase } from './supabaseClient'
import type { User, Post } from '../types'

/**
 * User Service
 * Handles all user-related operations including profile management and user queries
 */

export interface UserService {
  getCurrentUser(): Promise<User | null>
  getUserById(userId: string): Promise<User>
  getUserByHandle(handle: string): Promise<User>
  updateUserProfile(userId: string, updates: Partial<User>): Promise<User>
  getUserPosts(userId: string, filter: 'posts' | 'media' | 'liked'): Promise<Post[]>
  getFollowers(userId: string): Promise<User[]>
  getFollowing(userId: string): Promise<User[]>
}

/**
 * Get current authenticated user's profile
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) return null

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authUser.id)
    .single()

  if (error) throw error
  return data
}

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<User> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

/**
 * Get user by handle
 */
export const getUserByHandle = async (handle: string): Promise<User> => {
  // Implementation will be added in future tasks
  throw new Error('Not implemented')
}

/**
 * Update user profile
 * Allows updating avatar, bio, and rank fields
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<User>
): Promise<User> => {
  // Only allow updating specific fields
  const allowedFields = ['avatar', 'bio', 'rank'];
  const filteredUpdates: Partial<User> = {};

  for (const key of allowedFields) {
    if (key in updates) {
      filteredUpdates[key as keyof User] = updates[key as keyof User];
    }
  }

  // Add updated_at timestamp
  const updateData = {
    ...filteredUpdates,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user's posts with filter
 */
export const getUserPosts = async (
  userId: string,
  filter: 'posts' | 'media' | 'liked'
): Promise<Post[]> => {
  let query = supabase
    .from('posts')
    .select(`
      *,
      user:users!user_id(*),
      original_post:posts!original_post_id(
        *,
        user:users!user_id(*)
      )
    `)
    .order('created_at', { ascending: false });

  if (filter === 'posts') {
    // Get all posts by this user (including re-racks)
    query = query.eq('user_id', userId);
  } else if (filter === 'media') {
    // Get posts by this user that have images
    query = query
      .eq('user_id', userId)
      .not('images', 'is', null)
      .neq('images', '{}');
  } else if (filter === 'liked') {
    // Get posts liked by this user
    const { data: likedPostIds, error: likesError } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId);

    if (likesError) throw likesError;

    if (!likedPostIds || likedPostIds.length === 0) {
      return [];
    }

    const postIds = likedPostIds.map(like => like.post_id);
    query = query.in('id', postIds);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Get engagement counts for each post
  const postsWithCounts = await Promise.all(
    (data || []).map(async (post) => {
      const [likesCount, commentsCount, reracksCount] = await Promise.all([
        supabase.from('likes').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
        supabase.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('original_post_id', post.id)
      ]);

      return {
        ...post,
        likes_count: likesCount.count || 0,
        comments_count: commentsCount.count || 0,
        reracks_count: reracksCount.count || 0,
        images: post.images || []
      };
    })
  );

  return postsWithCounts;
}

/**
 * Get user's followers
 */
export const getFollowers = async (userId: string): Promise<User[]> => {
  const { data, error } = await supabase
    .from('follows')
    .select('follower:users!follows_follower_id_fkey(*)')
    .eq('following_id', userId)

  if (error) throw error

  // Extract the user objects from the nested structure
  return (data || []).map(item => item.follower).filter(Boolean)
}

/**
 * Get users that the user is following
 */
export const getFollowing = async (userId: string): Promise<User[]> => {
  const { data, error } = await supabase
    .from('follows')
    .select('following:users!follows_following_id_fkey(*)')
    .eq('follower_id', userId)

  if (error) throw error

  // Extract the user objects from the nested structure
  return (data || []).map(item => item.following).filter(Boolean)
}

/**
 * Search users by name or handle
 */
export const searchUsers = async (query: string): Promise<User[]> => {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`name.ilike.%${query}%,handle.ilike.%${query}%`)
    .limit(10);

  if (error) throw error;
  return data || [];
}
