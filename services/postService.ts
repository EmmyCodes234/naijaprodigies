import { supabase } from './supabaseClient'
import type { Post, Comment } from '../types'
import rateLimiter, { RateLimitError, formatTimeUntilReset } from '../utils/rateLimiter'

/**
 * Post Service
 * Handles all post-related operations including creation, retrieval, likes, comments, and re-racks
 */

export interface PostService {
  createPost(userId: string, content: string, imageUrls?: string[]): Promise<Post>
  getPosts(limit: number, offset: number, currentUserId?: string, feedType?: 'for-you' | 'following'): Promise<Post[]>
  getPostById(postId: string, currentUserId?: string): Promise<Post>
  deletePost(postId: string, userId: string): Promise<void>
  likePost(postId: string, userId: string): Promise<void>
  unlikePost(postId: string, userId: string): Promise<void>
  createComment(postId: string, userId: string, content: string, parentCommentId?: string): Promise<Comment>
  createReRack(postId: string, userId: string, quoteText?: string): Promise<Post>
  savePost(postId: string, userId: string): Promise<void>
  unsavePost(postId: string, userId: string): Promise<void>
  getSavedPosts(userId: string): Promise<Post[]>
  getTrends(limit?: number): Promise<{ tag: string; count: number }[]>
}

/**
 * Create a new post
 */
export const createPost = async (
  userId: string,
  content: string,
  imageUrls?: string[]
): Promise<Post> => {
  // Check rate limit
  if (!rateLimiter.checkLimit(userId, 'post_creation')) {
    const timeUntilReset = rateLimiter.getTimeUntilReset(userId, 'post_creation')
    const formattedTime = formatTimeUntilReset(timeUntilReset)
    throw new RateLimitError(
      `Rate limit exceeded. You can create more posts in ${formattedTime}. Limit: 10 posts per hour.`,
      'post_creation',
      timeUntilReset
    )
  }

  // Validate character limit (280 chars)
  if (content.length > 280) {
    throw new Error('Post content exceeds 280 character limit')
  }

  // Validate content is not empty
  if (!content.trim()) {
    throw new Error('Post content cannot be empty')
  }

  // Extract tags
  const tags = content.match(/#[\w]+/g) || [];

  // Insert post into database
  const { data: postData, error: postError } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      content: content.trim(),
      is_rerack: false
    })
    .select()
    .single()

  if (postError) {
    throw new Error(`Failed to create post: ${postError.message}`)
  }

  // Insert tags if any
  if (tags.length > 0) {
    const tagRecords = tags.map(tag => ({
      post_id: postData.id,
      tag: tag.substring(1).toLowerCase(), // Remove # and normalize
    }));

    const { error: tagError } = await supabase
      .from('post_tags')
      .insert(tagRecords);

    if (tagError) {
      console.error('Failed to insert tags:', tagError);
      // Don't fail the post creation for this, just log it
    }
  }

  // Insert images if provided
  if (imageUrls && imageUrls.length > 0) {
    const imageRecords = imageUrls.map((url, index) => ({
      post_id: postData.id,
      image_url: url,
      position: index + 1
    }))

    const { error: imageError } = await supabase
      .from('post_images')
      .insert(imageRecords)

    if (imageError) {
      // Rollback: delete the post if image insertion fails
      await supabase.from('posts').delete().eq('id', postData.id)
      throw new Error(`Failed to attach images: ${imageError.message}`)
    }
  }

  // Fetch the user data
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (userError) {
    throw new Error(`Failed to fetch user data: ${userError.message}`)
  }

  // Fetch images for the post
  const { data: imagesData } = await supabase
    .from('post_images')
    .select('image_url')
    .eq('post_id', postData.id)
    .order('position', { ascending: true })

  const images = imagesData?.map(img => img.image_url) || []

  // Record successful action for rate limiting
  rateLimiter.recordAction(userId, 'post_creation')

  // Return the complete post object
  return {
    id: postData.id,
    user_id: postData.user_id,
    user: userData,
    content: postData.content,
    images: images,
    likes_count: 0,
    comments_count: 0,
    reracks_count: 0,
    created_at: postData.created_at,
    is_rerack: postData.is_rerack,
    original_post: undefined,
    quote_text: undefined,
    is_liked_by_current_user: false
  }
}

/**
 * Get posts with pagination
 * Returns posts in reverse chronological order (newest first)
 */
export const getPosts = async (
  limit: number = 50,
  offset: number = 0,
  currentUserId?: string,
  feedType: 'for-you' | 'following' = 'for-you'
): Promise<Post[]> => {
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
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Apply 'Following' filter
  if (feedType === 'following' && currentUserId) {
    // 1. Get list of users the current user follows
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId);

    // 2. Extract IDs and include current user's own ID
    const followingIds = followingData?.map(f => f.following_id) || [];
    followingIds.push(currentUserId);

    // 3. Filter posts
    query = query.in('user_id', followingIds);
  } else if (feedType === 'following' && !currentUserId) {
    // If trying to view following but not logged in, return empty
    return [];
  }

  const { data: postsData, error: postsError } = await query;

  if (postsError) {
    throw new Error(`Failed to fetch posts: ${postsError.message}`)
  }

  if (!postsData || postsData.length === 0) {
    return []
  }

  // Get post IDs for batch fetching engagement counts
  const postIds = postsData.map((post: any) => post.id)

  // Fetch likes counts
  const { data: likesData } = await supabase
    .from('likes')
    .select('post_id, user_id')
    .in('post_id', postIds)

  // Fetch comments counts
  const { data: commentsData } = await supabase
    .from('comments')
    .select('post_id')
    .in('post_id', postIds)

  // Fetch reracks counts (posts that reference these posts)
  const { data: reracksData } = await supabase
    .from('posts')
    .select('original_post_id')
    .in('original_post_id', postIds)
    .eq('is_rerack', true)

  // Create count maps and liked posts set
  const likesCounts = likesData?.reduce((acc: any, like: any) => {
    acc[like.post_id] = (acc[like.post_id] || 0) + 1
    return acc
  }, {}) || {}

  const likedByCurrentUser = new Set(
    likesData?.filter((like: any) => like.user_id === currentUserId).map((like: any) => like.post_id) || []
  )

  const commentsCounts = commentsData?.reduce((acc: any, comment: any) => {
    acc[comment.post_id] = (acc[comment.post_id] || 0) + 1
    return acc
  }, {}) || {}

  const reracksCounts = reracksData?.reduce((acc: any, rerack: any) => {
    acc[rerack.original_post_id] = (acc[rerack.original_post_id] || 0) + 1
    return acc
  }, {}) || {}

  // Fetch original posts for re-racks
  const rerackPostIds = postsData
    .filter((post: any) => post.is_rerack && post.original_post_id)
    .map((post: any) => post.original_post_id)

  let originalPostsMap: Map<string, any> = new Map()

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
      .in('id', rerackPostIds)

    if (originalPostsData) {
      originalPostsData.forEach((originalPost: any) => {
        originalPostsMap.set(originalPost.id, originalPost)
      })
    }
  }

  // Transform the data to match the Post type
  return postsData.map((post: any) => {
    let originalPost = undefined

    if (post.is_rerack && post.original_post_id) {
      const originalData = originalPostsMap.get(post.original_post_id)
      if (originalData) {
        originalPost = {
          id: originalData.id,
          user_id: originalData.user_id,
          user: originalData.user,
          content: originalData.content,
          images: originalData.post_images
            ?.sort((a: any, b: any) => a.position - b.position)
            .map((img: any) => img.image_url) || [],
          likes_count: likesCounts[originalData.id] || 0,
          comments_count: commentsCounts[originalData.id] || 0,
          reracks_count: reracksCounts[originalData.id] || 0,
          created_at: originalData.created_at,
          is_rerack: originalData.is_rerack,
          original_post: undefined,
          quote_text: originalData.quote_text,
          is_liked_by_current_user: likedByCurrentUser.has(originalData.id)
        }
      }
    }

    return {
      id: post.id,
      user_id: post.user_id,
      user: post.user,
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
      is_liked_by_current_user: likedByCurrentUser.has(post.id)
    }
  })
}

/**
 * Get a single post by ID
 */
export const getPostById = async (postId: string, currentUserId?: string): Promise<Post> => {
  const { data: postData, error: postError } = await supabase
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
    .eq('id', postId)
    .single()

  if (postError) {
    throw new Error(`Failed to fetch post: ${postError.message}`)
  }

  if (!postData) {
    throw new Error('Post not found');
  }

  // IDs to fetch counts for (this post + original if rerack)
  const postIds = [postId];
  if (postData.is_rerack && postData.original_post_id) {
    postIds.push(postData.original_post_id);
  }

  // Fetch engagement counts
  const { data: likesData } = await supabase
    .from('likes')
    .select('post_id, user_id')
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

  // Process counts
  const likesCounts = likesData?.reduce((acc: any, like: any) => {
    acc[like.post_id] = (acc[like.post_id] || 0) + 1;
    return acc;
  }, {}) || {};

  const likedByCurrentUser = new Set(
    likesData?.filter((like: any) => like.user_id === currentUserId).map((like: any) => like.post_id) || []
  );

  const commentsCounts = commentsData?.reduce((acc: any, comment: any) => {
    acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
    return acc;
  }, {}) || {};

  const reracksCounts = reracksData?.reduce((acc: any, rerack: any) => {
    acc[rerack.original_post_id] = (acc[rerack.original_post_id] || 0) + 1;
    return acc;
  }, {}) || {};

  // Fetch Original Post if needed
  let originalPost = undefined;
  if (postData.is_rerack && postData.original_post_id) {
    const { data: originalData } = await supabase
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
      .eq('id', postData.original_post_id)
      .single();

    if (originalData) {
      originalPost = {
        id: originalData.id,
        user_id: originalData.user_id,
        user: Array.isArray(originalData.user) ? originalData.user[0] : originalData.user,
        content: originalData.content,
        images: originalData.post_images
          ?.sort((a: any, b: any) => a.position - b.position)
          .map((img: any) => img.image_url) || [],
        likes_count: likesCounts[originalData.id] || 0,
        comments_count: commentsCounts[originalData.id] || 0,
        reracks_count: reracksCounts[originalData.id] || 0,
        created_at: originalData.created_at,
        is_rerack: originalData.is_rerack,
        original_post: undefined,
        quote_text: originalData.quote_text,
        is_liked_by_current_user: likedByCurrentUser.has(originalData.id)
      };
    }
  }

  // Construct and return Post
  return {
    id: postData.id,
    user_id: postData.user_id,
    user: Array.isArray(postData.user) ? postData.user[0] : postData.user, // Handle array or object from Supabase join
    content: postData.content,
    images: postData.post_images
      ?.sort((a: any, b: any) => a.position - b.position)
      .map((img: any) => img.image_url) || [],
    likes_count: likesCounts[postData.id] || 0,
    comments_count: commentsCounts[postData.id] || 0,
    reracks_count: reracksCounts[postData.id] || 0,
    created_at: postData.created_at,
    is_rerack: postData.is_rerack,
    original_post: originalPost,
    quote_text: postData.quote_text,
    is_liked_by_current_user: likedByCurrentUser.has(postData.id)
  };
}

/**
 * Delete a post (must be owner)
 */
export const deletePost = async (postId: string, userId: string): Promise<void> => {
  // 1. Fetch post to get images
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('user_id')
    .eq('id', postId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch post for deletion: ${fetchError.message}`)
  }

  if (post.user_id !== userId) {
    throw new Error('Unauthorized: You can only delete your own posts')
  }

  // 2. Delete images from storage (if any)
  const { data: images } = await supabase
    .from('post_images')
    .select('image_url')
    .eq('post_id', postId)

  if (images && images.length > 0) {
    const filesToRemove = images.map(img => {
      const parts = img.image_url.split('/')
      return `${userId}/${parts[parts.length - 1]}`
    })

    await supabase.storage
      .from('posts')
      .remove(filesToRemove)
  }

  // 3. Delete post from DB
  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)

  if (deleteError) {
    throw new Error(`Failed to delete post: ${deleteError.message}`)
  }
}

/**
 * Like a post
 */
export const likePost = async (postId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('likes')
    .insert({
      post_id: postId,
      user_id: userId
    })

  if (error) {
    if (error.code === '23505') {
      throw new Error('Post already liked')
    }
    throw new Error(`Failed to like post: ${error.message}`)
  }
}

/**
 * Unlike a post
 */
export const unlikePost = async (postId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to unlike post: ${error.message}`)
  }
}

/**
 * Create a comment on a post
 */
export const createComment = async (
  postId: string,
  userId: string,
  content: string,
  parentCommentId?: string
): Promise<Comment> => {
  // Validate content is not empty
  if (!content.trim()) {
    throw new Error('Comment content cannot be empty')
  }

  // Insert comment into database
  const { data: commentData, error: commentError } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: userId,
      content: content.trim(),
      parent_comment_id: parentCommentId || null
    })
    .select()
    .single()

  if (commentError) {
    throw new Error(`Failed to create comment: ${commentError.message}`)
  }

  // Fetch the user data
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (userError) {
    throw new Error(`Failed to fetch user data: ${userError.message}`)
  }

  // Return the complete comment object
  return {
    id: commentData.id,
    post_id: commentData.post_id,
    user_id: commentData.user_id,
    user: userData,
    content: commentData.content,
    parent_comment_id: commentData.parent_comment_id,
    created_at: commentData.created_at,
    replies: []
  }
}

/**
 * Get comments for a post with threading support
 */
export const getComments = async (postId: string): Promise<Comment[]> => {
  // Fetch all comments for the post
  const { data: commentsData, error: commentsError } = await supabase
    .from('comments')
    .select(`
      id,
      post_id,
      user_id,
      content,
      parent_comment_id,
      created_at,
      user:users!comments_user_id_fkey(
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
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (commentsError) {
    throw new Error(`Failed to fetch comments: ${commentsError.message}`)
  }

  if (!commentsData || commentsData.length === 0) {
    return []
  }

  // Build a map of comments by ID for easy lookup
  const commentsMap = new Map<string, Comment>()
  const rootComments: Comment[] = []

  // First pass: create all comment objects
  commentsData.forEach((comment: any) => {
    const commentObj: Comment = {
      id: comment.id,
      post_id: comment.post_id,
      user_id: comment.user_id,
      user: Array.isArray(comment.user) ? comment.user[0] : comment.user,
      content: comment.content,
      parent_comment_id: comment.parent_comment_id,
      created_at: comment.created_at,
      replies: []
    }
    commentsMap.set(comment.id, commentObj)
  })

  // Second pass: build the tree structure
  commentsMap.forEach((comment) => {
    if (comment.parent_comment_id) {
      // This is a reply, add it to parent's replies
      const parent = commentsMap.get(comment.parent_comment_id)
      if (parent) {
        parent.replies = parent.replies || []
        parent.replies.push(comment)
      }
    } else {
      // This is a root comment
      rootComments.push(comment)
    }
  })

  return rootComments
}

/**
 * Create a re-rack (simple or quote)
 */
export const createReRack = async (
  postId: string,
  userId: string,
  quoteText?: string
): Promise<Post> => {
  // Validate that the original post exists
  const { data: originalPost, error: fetchError } = await supabase
    .from('posts')
    .select('id')
    .eq('id', postId)
    .single()

  if (fetchError || !originalPost) {
    throw new Error('Original post not found')
  }

  // Validate quote text if provided (should not exceed 280 chars)
  if (quoteText && quoteText.length > 280) {
    throw new Error('Quote text exceeds 280 character limit')
  }

  // Insert re-rack post into database
  const { data: rerackData, error: rerackError } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      content: quoteText || '', // Empty content for simple re-rack
      is_rerack: true,
      original_post_id: postId,
      quote_text: quoteText || null
    })
    .select()
    .single()

  if (rerackError) {
    throw new Error(`Failed to create re-rack: ${rerackError.message}`)
  }

  // Fetch the user data
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (userError) {
    throw new Error(`Failed to fetch user data: ${userError.message}`)
  }

  // Fetch the original post with full details
  const { data: originalPostData, error: originalPostError } = await supabase
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
    .eq('id', postId)
    .single()

  if (originalPostError) {
    throw new Error(`Failed to fetch original post: ${originalPostError.message}`)
  }

  // Transform original post data
  const originalPostObj: Post = {
    id: originalPostData.id,
    user_id: originalPostData.user_id,
    user: Array.isArray(originalPostData.user) ? originalPostData.user[0] : originalPostData.user,
    content: originalPostData.content,
    images: originalPostData.post_images
      ?.sort((a: any, b: any) => a.position - b.position)
      .map((img: any) => img.image_url) || [],
    likes_count: 0,
    comments_count: 0,
    reracks_count: 0,
    created_at: originalPostData.created_at,
    is_rerack: originalPostData.is_rerack,
    original_post: undefined,
    quote_text: originalPostData.quote_text,
    is_liked_by_current_user: false
  }

  // Return the complete re-rack post object
  return {
    id: rerackData.id,
    user_id: rerackData.user_id,
    user: userData,
    content: rerackData.content,
    images: [], // Re-racks don't have their own images
    likes_count: 0,
    comments_count: 0,
    reracks_count: 0,
    created_at: rerackData.created_at,
    is_rerack: rerackData.is_rerack,
    original_post: originalPostObj,
    quote_text: rerackData.quote_text,
    is_liked_by_current_user: false
  }
}

/**
 * Subscribe to real-time post updates
 * Returns a subscription object that can be unsubscribed
 */
export const subscribeToNewPosts = (
  onNewPost: (post: Post) => void,
  onError?: (error: Error) => void
) => {
  const channel = supabase
    .channel('posts-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'posts'
      },
      async (payload) => {
        try {
          // Fetch the complete post data with user info and images
          const { data: postData, error: postError } = await supabase
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
            .eq('id', payload.new.id)
            .single()

          if (postError) {
            throw new Error(`Failed to fetch new post: ${postError.message}`)
          }

          // Transform to Post type
          const newPost: Post = {
            id: postData.id,
            user_id: postData.user_id,
            user: Array.isArray(postData.user) ? postData.user[0] : postData.user,
            content: postData.content,
            images: postData.post_images
              ?.sort((a: any, b: any) => a.position - b.position)
              .map((img: any) => img.image_url) || [],
            likes_count: 0,
            comments_count: 0,
            reracks_count: 0,
            created_at: postData.created_at,
            is_rerack: postData.is_rerack,
            original_post: undefined,
            quote_text: postData.quote_text,
            is_liked_by_current_user: false
          }

          onNewPost(newPost)
        } catch (error) {
          if (onError) {
            onError(error instanceof Error ? error : new Error('Unknown error'))
          } else {
            console.error('Error processing new post:', error)
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
 * Subscribe to real-time like updates for posts
 * Returns a subscription object that can be unsubscribed
 */
export const subscribeToLikes = (
  onLikeChange: (postId: string, userId: string, isLike: boolean) => void,
  onError?: (error: Error) => void
) => {
  const channel = supabase
    .channel('likes-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'likes'
      },
      (payload) => {
        try {
          onLikeChange(payload.new.post_id, payload.new.user_id, true)
        } catch (error) {
          if (onError) {
            onError(error instanceof Error ? error : new Error('Unknown error'))
          } else {
            console.error('Error processing like:', error)
          }
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'likes'
      },
      (payload) => {
        try {
          onLikeChange(payload.old.post_id, payload.old.user_id, false)
        } catch (error) {
          if (onError) {
            onError(error instanceof Error ? error : new Error('Unknown error'))
          } else {
            console.error('Error processing unlike:', error)
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
 * Subscribe to real-time comment updates for posts
 * Returns a subscription object that can be unsubscribed
 */
export const subscribeToComments = (
  onNewComment: (comment: Comment) => void,
  onError?: (error: Error) => void
) => {
  const channel = supabase
    .channel('comments-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'comments'
      },
      async (payload) => {
        try {
          // Fetch the complete comment data with user info
          const { data: commentData, error: commentError } = await supabase
            .from('comments')
            .select(`
              id,
              post_id,
              user_id,
              content,
              parent_comment_id,
              created_at,
              user:users!comments_user_id_fkey(
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

          if (commentError) {
            throw new Error(`Failed to fetch new comment: ${commentError.message}`)
          }

          // Transform to Comment type
          const newComment: Comment = {
            id: commentData.id,
            post_id: commentData.post_id,
            user_id: commentData.user_id,
            user: Array.isArray(commentData.user) ? commentData.user[0] : commentData.user,
            content: commentData.content,
            parent_comment_id: commentData.parent_comment_id,
            created_at: commentData.created_at,
            replies: []
          }

          onNewComment(newComment)
        } catch (error) {
          if (onError) {
            onError(error instanceof Error ? error : new Error('Unknown error'))
          } else {
            console.error('Error processing new comment:', error)
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
 * Subscribe to real-time re-rack updates for posts
 * Returns a subscription object that can be unsubscribed
 */
export const subscribeToReRacks = (
  onReRackChange: (originalPostId: string) => void,
  onError?: (error: Error) => void
) => {
  const channel = supabase
    .channel('reracks-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: 'is_rerack=eq.true'
      },
      (payload) => {
        try {
          if (payload.new.original_post_id) {
            onReRackChange(payload.new.original_post_id)
          }
        } catch (error) {
          if (onError) {
            onError(error instanceof Error ? error : new Error('Unknown error'))
          } else {
            console.error('Error processing re-rack:', error)
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
 * Save a post for the user
 */
export const savePost = async (postId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('saved_posts')
    .insert({
      post_id: postId,
      user_id: userId
    })

  if (error) {
    if (error.code === '23505') {
      // Already saved, ignore
      return
    }
    throw new Error(`Failed to save post: ${error.message}`)
  }
}

/**
 * Unsave a post
 */
export const unsavePost = async (postId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('saved_posts')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to unsave post: ${error.message}`)
  }
}

/**
 * Get saved posts for a user
 */
export const getSavedPosts = async (userId: string): Promise<Post[]> => {
  // 1. Get saved post IDs
  const { data: savedData, error: savedError } = await supabase
    .from('saved_posts')
    .select('post_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (savedError) {
    throw new Error(`Failed to fetch saved posts: ${savedError.message}`)
  }

  if (!savedData || savedData.length === 0) {
    return []
  }

  const postIds = savedData.map(item => item.post_id)

  // 2. Fetch the actual posts
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
    .in('id', postIds)

  if (postsError) {
    throw new Error(`Failed to fetch posts details: ${postsError.message}`)
  }

  if (!postsData) return []

  // Create a map for easy access and maintain saved order
  const postsMap = new Map(postsData.map(p => [p.id, p]))
  const orderedPosts = postIds
    .map(id => postsMap.get(id))
    .filter(p => p !== undefined)

  // Fetch engagement counts
  const { data: likesData } = await supabase
    .from('likes')
    .select('post_id, user_id')
    .in('post_id', postIds)

  const { data: commentsData } = await supabase
    .from('comments')
    .select('post_id')
    .in('post_id', postIds)

  const { data: reracksData } = await supabase
    .from('posts')
    .select('original_post_id')
    .in('original_post_id', postIds)
    .eq('is_rerack', true)

  const likesCounts = likesData?.reduce((acc: any, like: any) => {
    acc[like.post_id] = (acc[like.post_id] || 0) + 1
    return acc
  }, {}) || {}

  const likedByCurrentUser = new Set(
    likesData?.filter((like: any) => like.user_id === userId).map((like: any) => like.post_id) || []
  )

  const commentsCounts = commentsData?.reduce((acc: any, comment: any) => {
    acc[comment.post_id] = (acc[comment.post_id] || 0) + 1
    return acc
  }, {}) || {}

  const reracksCounts = reracksData?.reduce((acc: any, rerack: any) => {
    acc[rerack.original_post_id] = (acc[rerack.original_post_id] || 0) + 1
    return acc
  }, {}) || {}

  // Transform data
  return orderedPosts.map(post => {
    // Re-racks inside saved posts logic (simplified)
    const originalPost = undefined

    return {
      id: post.id,
      user_id: post.user_id,
      user: Array.isArray(post.user) ? post.user[0] : post.user,
      content: post.content,
      images: post.post_images?.sort((a: any, b: any) => a.position - b.position).map((img: any) => img.image_url) || [],
      likes_count: likesCounts[post.id] || 0,
      comments_count: commentsCounts[post.id] || 0,
      reracks_count: reracksCounts[post.id] || 0,
      created_at: post.created_at,
      is_rerack: post.is_rerack,
      original_post: originalPost,
      quote_text: post.quote_text,
      is_liked_by_current_user: likedByCurrentUser.has(post.id)
    }
  })
}

/**
 * Get trending tags
 */
export const getTrends = async (limit: number = 5): Promise<{ tag: string; count: number }[]> => {
  // This is a bit complex in Supabase without a specific stats table or RPC.
  // We will fetch recent tags and aggregate them client-side (or server-side if this was a Function).
  // For scalability, we should use an RPC function or a materialized view.
  // For now, let's fetch the last 500 tags and count them.

  const { data, error } = await supabase
    .from('post_tags')
    .select('tag')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw error;

  const tagCounts: Record<string, number> = {};
  data?.forEach(item => {
    // Normalize case again just to be safe
    const tag = item.tag.toLowerCase();
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  });

  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag: `#${tag}`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
