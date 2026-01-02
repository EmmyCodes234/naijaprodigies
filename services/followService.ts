import { supabase } from './supabaseClient'
import rateLimiter, { RateLimitError, formatTimeUntilReset } from '../utils/rateLimiter'

/**
 * Follow Service
 * Handles all follow/unfollow operations and follow relationship queries
 */

export interface FollowService {
  followUser(followerId: string, followingId: string): Promise<void>
  unfollowUser(followerId: string, followingId: string): Promise<void>
  isFollowing(followerId: string, followingId: string): Promise<boolean>
  getFollowerCount(userId: string): Promise<number>
  getFollowingCount(userId: string): Promise<number>
}

/**
 * Follow a user
 */
export const followUser = async (
  followerId: string,
  followingId: string
): Promise<void> => {
  // Check rate limit
  if (!rateLimiter.checkLimit(followerId, 'follow_action')) {
    const timeUntilReset = rateLimiter.getTimeUntilReset(followerId, 'follow_action')
    const formattedTime = formatTimeUntilReset(timeUntilReset)
    throw new RateLimitError(
      `Rate limit exceeded. You can perform more follow actions in ${formattedTime}. Limit: 50 actions per hour.`,
      'follow_action',
      timeUntilReset
    )
  }

  // Prevent self-follow (also enforced by database constraint)
  if (followerId === followingId) {
    throw new Error('Cannot follow yourself')
  }

  const { error } = await supabase
    .from('follows')
    .insert({
      follower_id: followerId,
      following_id: followingId
    })

  if (error) {
    // Handle duplicate follow attempt gracefully
    if (error.code === '23505') {
      // Already following, ignore
      return
    }
    throw error
  }

  // Record successful action for rate limiting
  rateLimiter.recordAction(followerId, 'follow_action')
}

/**
 * Unfollow a user
 */
export const unfollowUser = async (
  followerId: string,
  followingId: string
): Promise<void> => {
  // Check rate limit
  if (!rateLimiter.checkLimit(followerId, 'follow_action')) {
    const timeUntilReset = rateLimiter.getTimeUntilReset(followerId, 'follow_action')
    const formattedTime = formatTimeUntilReset(timeUntilReset)
    throw new RateLimitError(
      `Rate limit exceeded. You can perform more follow actions in ${formattedTime}. Limit: 50 actions per hour.`,
      'follow_action',
      timeUntilReset
    )
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)

  if (error) throw error

  // Record successful action for rate limiting
  rateLimiter.recordAction(followerId, 'follow_action')
}

/**
 * Check if a user is following another user
 */
export const isFollowing = async (
  followerId: string,
  followingId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle()

  if (error) throw error
  return data !== null
}

/**
 * Get follower count for a user
 */
export const getFollowerCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('following_id', userId)

  if (error) throw error
  return count || 0
}

/**
 * Get following count for a user
 */
export const getFollowingCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('follower_id', userId)

  if (error) throw error
  return count || 0
}
