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
  const allowedFields = ['avatar', 'bio', 'rank', 'cover_url', 'website', 'location', 'birth_date'];
  const filteredUpdates: Partial<User> = {};

  allowedFields.forEach((key) => {
    const field = key as keyof User;
    if (updates[field] !== undefined) {
      if (typeof updates[field] === 'string' || typeof updates[field] === 'boolean' || updates[field] === null) {
        // @ts-ignore
        filteredUpdates[field] = updates[field];
      }
    }
  });

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
  // 1. Base Query
  let query = supabase
    .from('posts')
    .select(`
      id,
      user_id,
      content,
      created_at,
      updated_at,
      is_rerack,
      original_post_id,
      quote_text,
      scheduled_for,
      poll_id,
      media_type,
      impressions_count,
      user:users!posts_user_id_fkey(
        id,
        handle,
        name,
        avatar,
        bio,
        rank,
        verified,
        verification_type,
        created_at,
        updated_at
      ),
      post_images(
        image_url,
        position
      )
    `)
    .order('created_at', { ascending: false });

  if (filter === 'posts') {
    // Get all posts by this user
    query = query.eq('user_id', userId);
  } else if (filter === 'media') {
    // Get posts by this user that have images
    query = query.eq('user_id', userId);
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

  const { data: postsData, error: postsError } = await query;

  if (postsError) throw postsError;

  if (!postsData || postsData.length === 0) {
    return [];
  }

  // Filter for 'media' in memory if needed
  let filteredPosts = postsData;
  if (filter === 'media') {
    filteredPosts = postsData.filter((p: any) => p.post_images && p.post_images.length > 0);
  }

  // 2. Batch Fetch Data
  const postIds = filteredPosts.map((post: any) => post.id);

  // Fetch likes counts
  const { data: likesData } = await supabase
    .from('likes')
    .select('post_id')
    .in('post_id', postIds);

  const { data: commentsData } = await supabase
    .from('comments')
    .select('post_id')
    .in('post_id', postIds);

  const { data: reracksData } = await supabase
    .from('posts')
    .select('original_post_id')
    .in('original_post_id', postIds)
    .eq('is_rerack', true);

  const likesCounts = likesData?.reduce((acc: any, like: any) => {
    acc[like.post_id] = (acc[like.post_id] || 0) + 1;
    return acc;
  }, {}) || {};

  const commentsCounts = commentsData?.reduce((acc: any, comment: any) => {
    acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
    return acc;
  }, {}) || {};

  const reracksCounts = reracksData?.reduce((acc: any, rerack: any) => {
    acc[rerack.original_post_id] = (acc[rerack.original_post_id] || 0) + 1;
    return acc;
  }, {}) || {};

  const { data: { user: authUser } } = await supabase.auth.getUser();
  const currentUserId = authUser?.id;

  let likedByCurrentUser = new Set<string>();
  if (currentUserId) {
    const { data: myLikes } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', currentUserId)
      .in('post_id', postIds);

    if (myLikes) {
      likedByCurrentUser = new Set(myLikes.map((l: any) => l.post_id));
    }
  }

  // 3. Handle Original Posts
  const rerackPostIds = filteredPosts
    .filter((post: any) => post.is_rerack && post.original_post_id)
    .map((post: any) => post.original_post_id);

  let originalPostsMap = new Map<string, any>();

  if (rerackPostIds.length > 0) {
    const { data: originalPostsData } = await supabase
      .from('posts')
      .select(`
        id,
        user_id,
        content,
        created_at,
        updated_at,
        is_rerack,
        original_post_id,
        quote_text,
        media_type,
        poll_id,
        scheduled_for,
        impressions_count,
        user:users!posts_user_id_fkey(
          id,
          handle,
          name,
          avatar,
          bio,
          rank,
          verified,
          verification_type,
          created_at,
          updated_at
        ),
        post_images(
          image_url,
          position
        )
      `)
      .in('id', rerackPostIds);

    if (originalPostsData) {
      originalPostsData.forEach((originalPost: any) => {
        originalPostsMap.set(originalPost.id, originalPost);
      });
    }
  }

  // 4. Transform and Stitch
  return filteredPosts.map((post: any) => {
    let originalPost = undefined;

    if (post.is_rerack && post.original_post_id) {
      const originalData = originalPostsMap.get(post.original_post_id);
      if (originalData) {
        originalPost = {
          id: originalData.id,
          user_id: originalData.user_id,
          user: Array.isArray(originalData.user) ? originalData.user[0] : originalData.user,
          content: originalData.content,
          images: originalData.post_images
            ?.sort((a: any, b: any) => a.position - b.position)
            .map((img: any) => img.image_url) || [],
          likes_count: 0,
          comments_count: 0,
          reracks_count: 0,
          created_at: originalData.created_at,
          is_rerack: originalData.is_rerack,
          quote_text: originalData.quote_text,
          media_type: originalData.media_type,
          impressions_count: originalData.impressions_count || 0
        };
      }
    }

    return {
      id: post.id,
      user_id: post.user_id,
      user: Array.isArray(post.user) ? post.user[0] : post.user,
      content: post.content,
      images: post.post_images
        ?.sort((a: any, b: any) => a.position - b.position)
        .map((img: any) => img.image_url) || [],
      likes_count: likesCounts[post.id] || 0,
      comments_count: commentsCounts[post.id] || 0,
      reracks_count: reracksCounts[post.id] || 0,
      created_at: post.created_at,
      is_rerack: post.is_rerack,
      original_post: originalPost,
      quote_text: post.quote_text,
      is_liked_by_current_user: likedByCurrentUser.has(post.id),
      media_type: post.media_type,
      impressions_count: post.impressions_count || 0
    };
  });
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
  return (data || []).map((item: any) => item.follower as User).filter(Boolean)
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
  return (data || []).map((item: any) => item.following as User).filter(Boolean)
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

/**
 * Get users to follow (excluding self and already followed)
 */
export const getWhoToFollow = async (currentUserId?: string, limit: number = 3): Promise<User[]> => {
  if (!currentUserId) {
    // If no user logged in, just return random users
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  // 1. Get list of IDs already followed
  const { data: followingData, error: followingError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', currentUserId);

  if (followingError) throw followingError;

  const followingIds = followingData.map(f => f.following_id);
  followingIds.push(currentUserId); // Exclude self

  // 2. Get users NOT in that list
  // Supabase postgrest filter for "not.in" takes a list
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .not('id', 'in', `(${followingIds.join(',')})`)
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Follow a user
 */
export const followUser = async (followerId: string, followingId: string): Promise<void> => {
  const { error } = await supabase
    .from('follows')
    .insert({
      follower_id: followerId,
      following_id: followingId
    });

  if (error) throw error;
}


/**
 * Unfollow a user
 */
export const unfollowUser = async (followerId: string, followingId: string): Promise<void> => {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) throw error;
}

/**
 * Get current user's email (from Auth)
 */
export const getAccountEmail = async (): Promise<string | undefined> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email;
}


/**
 * Update user password
 */
export const updatePassword = async (newPassword: string): Promise<void> => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) throw error;
}

/**
 * Get connected accounts (identities)
 */
export const getConnectedAccounts = async (): Promise<any[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.identities || [];
}

