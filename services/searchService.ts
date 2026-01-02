import { supabase } from './supabaseClient'
import type { User, Post } from '../types'

/**
 * Search Service
 * Handles all search operations for users, posts, and hashtags
 */

export interface SearchResults {
  users: User[]
  posts: Post[]
}

export interface SearchService {
  searchUsers(query: string): Promise<User[]>
  searchPosts(query: string): Promise<Post[]>
  searchHashtags(hashtag: string): Promise<Post[]>
  searchAll(query: string): Promise<SearchResults>
}

/**
 * Search for users by handle or name
 * Prioritizes exact username matches
 */
export const searchUsers = async (query: string): Promise<User[]> => {
  if (!query.trim()) {
    return []
  }

  const searchTerm = query.trim().toLowerCase()

  // Search for users by handle or name (case-insensitive)
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('*')
    .or(`handle.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false })
    .limit(20)

  if (usersError) {
    throw new Error(`Failed to search users: ${usersError.message}`)
  }

  if (!usersData || usersData.length === 0) {
    return []
  }

  // Sort results to prioritize exact handle matches
  const sortedUsers = usersData.sort((a, b) => {
    const aHandleLower = a.handle.toLowerCase()
    const bHandleLower = b.handle.toLowerCase()
    
    // Exact match comes first
    if (aHandleLower === searchTerm && bHandleLower !== searchTerm) return -1
    if (bHandleLower === searchTerm && aHandleLower !== searchTerm) return 1
    
    // Handle starts with query comes next
    if (aHandleLower.startsWith(searchTerm) && !bHandleLower.startsWith(searchTerm)) return -1
    if (bHandleLower.startsWith(searchTerm) && !aHandleLower.startsWith(searchTerm)) return 1
    
    // Otherwise maintain original order
    return 0
  })

  return sortedUsers
}

/**
 * Search for posts by content
 */
export const searchPosts = async (query: string): Promise<Post[]> => {
  if (!query.trim()) {
    return []
  }

  const searchTerm = query.trim()

  // Search for posts by content (case-insensitive)
  const { data: postsData, error: postsError } = await supabase
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
      user:users!posts_user_id_fkey(
        id,
        handle,
        name,
        avatar,
        bio,
        rank,
        verified,
        created_at,
        updated_at
      ),
      post_images(
        image_url,
        position
      )
    `)
    .ilike('content', `%${searchTerm}%`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (postsError) {
    throw new Error(`Failed to search posts: ${postsError.message}`)
  }

  if (!postsData || postsData.length === 0) {
    return []
  }

  // Get post IDs for batch fetching engagement counts
  const postIds = postsData.map((post: any) => post.id)

  // Fetch likes counts
  const { data: likesData } = await supabase
    .from('likes')
    .select('post_id')
    .in('post_id', postIds)

  // Fetch comments counts
  const { data: commentsData } = await supabase
    .from('comments')
    .select('post_id')
    .in('post_id', postIds)

  // Fetch reracks counts
  const { data: reracksData } = await supabase
    .from('posts')
    .select('original_post_id')
    .in('original_post_id', postIds)
    .eq('is_rerack', true)

  // Create count maps
  const likesCounts = likesData?.reduce((acc: any, like: any) => {
    acc[like.post_id] = (acc[like.post_id] || 0) + 1
    return acc
  }, {}) || {}

  const commentsCounts = commentsData?.reduce((acc: any, comment: any) => {
    acc[comment.post_id] = (acc[comment.post_id] || 0) + 1
    return acc
  }, {}) || {}

  const reracksCounts = reracksData?.reduce((acc: any, rerack: any) => {
    acc[rerack.original_post_id] = (acc[rerack.original_post_id] || 0) + 1
    return acc
  }, {}) || {}

  // Transform the data to match the Post type
  return postsData.map((post: any) => ({
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
    original_post: undefined, // Not fetching original posts for search results
    quote_text: post.quote_text,
    is_liked_by_current_user: false
  }))
}

/**
 * Search for posts by hashtag
 * Searches for posts containing the exact hashtag
 */
export const searchHashtags = async (hashtag: string): Promise<Post[]> => {
  if (!hashtag.trim()) {
    return []
  }

  // Ensure hashtag starts with #
  const searchHashtag = hashtag.trim().startsWith('#') ? hashtag.trim() : `#${hashtag.trim()}`

  // Search for posts containing the hashtag (case-insensitive)
  const { data: postsData, error: postsError } = await supabase
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
      user:users!posts_user_id_fkey(
        id,
        handle,
        name,
        avatar,
        bio,
        rank,
        verified,
        created_at,
        updated_at
      ),
      post_images(
        image_url,
        position
      )
    `)
    .ilike('content', `%${searchHashtag}%`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (postsError) {
    throw new Error(`Failed to search hashtags: ${postsError.message}`)
  }

  if (!postsData || postsData.length === 0) {
    return []
  }

  // Get post IDs for batch fetching engagement counts
  const postIds = postsData.map((post: any) => post.id)

  // Fetch likes counts
  const { data: likesData } = await supabase
    .from('likes')
    .select('post_id')
    .in('post_id', postIds)

  // Fetch comments counts
  const { data: commentsData } = await supabase
    .from('comments')
    .select('post_id')
    .in('post_id', postIds)

  // Fetch reracks counts
  const { data: reracksData } = await supabase
    .from('posts')
    .select('original_post_id')
    .in('original_post_id', postIds)
    .eq('is_rerack', true)

  // Create count maps
  const likesCounts = likesData?.reduce((acc: any, like: any) => {
    acc[like.post_id] = (acc[like.post_id] || 0) + 1
    return acc
  }, {}) || {}

  const commentsCounts = commentsData?.reduce((acc: any, comment: any) => {
    acc[comment.post_id] = (acc[comment.post_id] || 0) + 1
    return acc
  }, {}) || {}

  const reracksCounts = reracksData?.reduce((acc: any, rerack: any) => {
    acc[rerack.original_post_id] = (acc[rerack.original_post_id] || 0) + 1
    return acc
  }, {}) || {}

  // Transform the data to match the Post type
  return postsData.map((post: any) => ({
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
    original_post: undefined, // Not fetching original posts for search results
    quote_text: post.quote_text,
    is_liked_by_current_user: false
  }))
}

/**
 * Search for both users and posts
 * Returns categorized results
 */
export const searchAll = async (query: string): Promise<SearchResults> => {
  if (!query.trim()) {
    return { users: [], posts: [] }
  }

  // Check if query is a hashtag search
  if (query.trim().startsWith('#')) {
    const posts = await searchHashtags(query)
    return { users: [], posts }
  }

  // Otherwise search both users and posts
  const [users, posts] = await Promise.all([
    searchUsers(query),
    searchPosts(query)
  ])

  return { users, posts }
}
