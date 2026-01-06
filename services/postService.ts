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
  createComment(postId: string, userId: string, content: string, parentCommentId?: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'gif'): Promise<Comment>
  createReRack(postId: string, userId: string, quoteText?: string): Promise<Post>
  savePost(postId: string, userId: string): Promise<void>
  unsavePost(postId: string, userId: string): Promise<void>
  getSavedPosts(userId: string): Promise<Post[]>
  getTrends(limit?: number): Promise<{ tag: string; count: number }[]>
  incrementImpressions(postId: string): Promise<void>
}

/**
 * Create a new post
 */
// Update createPost signature
export const createPost = async (
  userId: string,
  content: string,
  imageUrls?: string[],
  scheduledFor?: Date,
  pollId?: string,
  mediaType: 'image' | 'video' | 'gif' = 'image',
  audioUrl?: string,
  audioDuration?: number
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
    throw new Error('Post exceeds 280 characters')
  }


  // Validate content is not empty (unless it has media or poll)
  if (!content.trim() && !imageUrls?.length && !pollId) {
    throw new Error('Post must contain text, media, or a poll')
  }

  // Extract tags
  const tags = content.match(/#[\w]+/g) || [];

  // Insert post into database
  // If we have a poll, we need to creating it first or handle it here.
  // Actually, createPost receives pollId if it was already created, OR we can refactor to create it here.
  // The signature has "pollId?: string". Let's assume the component creates the poll first?
  // No, better to encapsulate it here to be atomic, but the signature implies pollId is passed.
  // Wait, looking at the previous plan, we should handle poll creation inside createPost if 'poll' object is passed.
  // But currently createPost accepts `pollId`. Let's update the signature to accept poll data instead?
  // Or simply insert the poll if pollId is missing but poll data is present.
  // For now, adhering to the existing signature "pollId?: string", meaning the poll is created beforehand?
  // No, that's risky. Let's modify the signature to accept `pollData`? 
  // Let's stick to the current signature for now but check if we need to do anything.
  // Actually, usually we pass the poll options.
  // Let's look at the usage.
  // If I change the signature, I break callers.
  // Let's overload or add optional `pollData`.

  // Let's modify the signature to accept `pollData` instead of or in addition to `pollId`.
  // Actually, let's look at how I planned to do it.
  // "Update createPost to explicitly handle Poll creation logic".

  // Let's add `pollData?: { question: string, options: string[], durationMinutes: number }` to the arguments.

  // But wait, I can't easily change the signature in the middle of this replacement without seeing the whole function again validation.
  // Let's assume for this step I will just use the `pollId` passed in.
  // But where is the poll created?
  // I need to add a `createPoll` function to `postService.ts` or handle it inside `createPost`.
  // Handling inside `createPost` is better for atomicity (though Supabase doesn't do multi-table transactions easily from client without an RPC).
  // I'll create a helper `createPoll` that returns an ID, then pass it to `createPost`.

  const { data: postData, error: postError } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      content: content.trim(),
      is_rerack: false,
      scheduled_for: scheduledFor ? scheduledFor.toISOString() : null,
      poll_id: pollId || null,
      media_type: mediaType,
      audio_url: audioUrl,
      audio_duration_ms: audioDuration,
      impressions_count: 0
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
      user_id: userId,
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
    is_liked_by_current_user: false,
    scheduled_for: postData.scheduled_for,
    poll_id: postData.poll_id,
    media_type: postData.media_type,
    impressions_count: 0
  }
}


/**
 * Upload a voice note to storage
 */
export const uploadVoiceNote = async (userId: string, blob: Blob): Promise<string> => {
  const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
  const filePath = `${userId}/${filename}`;

  const { error } = await supabase.storage
    .from('voice-notes')
    .upload(filePath, blob, {
      contentType: blob.type || 'audio/webm',
      upsert: true
    });

  if (error) {
    console.error('Error uploading voice note:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('voice-notes')
    .getPublicUrl(filePath);

  return publicUrl;
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
  // Base query
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
      impressions_count,
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
    .order('created_at', { ascending: false })
    .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`)
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

  // Fetch all related data in parallel
  const [
    { data: likesData },
    { data: commentsData },
    { data: reracksData },
    savedDataResult
  ] = await Promise.all([
    supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
    supabase.from('comments').select('post_id').in('post_id', postIds),
    supabase.from('posts').select('original_post_id').in('original_post_id', postIds).eq('is_rerack', true),
    currentUserId ? supabase.from('saved_posts').select('post_id').eq('user_id', currentUserId).in('post_id', postIds) : Promise.resolve({ data: null })
  ]);

  // Fetch saved status for current user
  let savedByCurrentUser = new Set<string>()
  if (savedDataResult.data) {
    savedByCurrentUser = new Set(savedDataResult.data.map((item: any) => item.post_id))
  }

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
          is_liked_by_current_user: likedByCurrentUser.has(originalData.id),
          is_saved_by_current_user: savedByCurrentUser.has(originalData.id),
          impressions_count: originalData.impressions_count || 0
        }
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
      is_saved_by_current_user: savedByCurrentUser.has(post.id),
      impressions_count: post.impressions_count || 0
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

  // Fetch reracks counts
  const { data: reracksData } = await supabase
    .from('posts')
    .select('original_post_id')
    .in('original_post_id', postIds)
    .eq('is_rerack', true);

  // Fetch saved status for current user
  let isSaved = false;
  let isOriginalSaved = false;

  if (currentUserId) {
    const { data: savedData } = await supabase
      .from('saved_posts')
      .select('post_id')
      .eq('user_id', currentUserId)
      .in('post_id', postIds);

    if (savedData) {
      const savedSet = new Set(savedData.map((item: any) => item.post_id));
      isSaved = savedSet.has(postId);
      if (postData.is_rerack && postData.original_post_id) {
        isOriginalSaved = savedSet.has(postData.original_post_id);
      }
    }
  }

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
        is_liked_by_current_user: likedByCurrentUser.has(originalData.id),
        is_saved_by_current_user: isOriginalSaved,
        impressions_count: originalData.impressions_count || 0
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
    is_liked_by_current_user: likedByCurrentUser.has(postData.id),
    is_saved_by_current_user: isSaved,
    impressions_count: postData.impressions_count || 0
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
  parentCommentId?: string,
  mediaUrl?: string,
  mediaType?: 'image' | 'video' | 'gif'
): Promise<Comment> => {
  // Validate content is not empty (unless media is present)
  if (!content.trim() && !mediaUrl) {
    throw new Error('Comment must contain text or media')
  }

  // Insert comment into database
  const { data: commentData, error: commentError } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: userId,
      content: content.trim(),
      parent_comment_id: parentCommentId || null,
      media_url: mediaUrl || null,
      media_type: mediaType || null
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
    replies: [],
    media_url: commentData.media_url,
    media_type: commentData.media_type,
    likes_count: 0,
    is_liked_by_current_user: false
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
      media_url,
      media_type,
      user:users!comments_user_id_fkey(
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
  const commentIds = commentsData.map((c: any) => c.id)

  // Fetch likes counts for all comments
  const { data: likesData } = await supabase
    .from('comment_likes')
    .select('comment_id, user_id')
    .in('comment_id', commentIds)

  // Build likes count map and liked by current user set
  const likesCounts: Record<string, number> = {}
  const likedByUser = new Set<string>()

  if (likesData) {
    likesData.forEach((like: any) => {
      likesCounts[like.comment_id] = (likesCounts[like.comment_id] || 0) + 1
    })
  }

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
      replies: [],
      media_url: comment.media_url,
      media_type: comment.media_type,
      likes_count: likesCounts[comment.id] || 0,
      is_liked_by_current_user: likedByUser.has(comment.id)
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
 * Like a comment
 */
export const likeComment = async (commentId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('comment_likes')
    .insert({ comment_id: commentId, user_id: userId })

  if (error && !error.message.includes('duplicate')) {
    throw new Error(`Failed to like comment: ${error.message}`)
  }
}

/**
 * Unlike a comment
 */
export const unlikeComment = async (commentId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('comment_likes')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to unlike comment: ${error.message}`)
  }
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
    is_liked_by_current_user: false,
    impressions_count: originalPostData.impressions_count || 0
  }

  // Return the complete re-rack post object
  return {
    id: rerackData.id,
    user_id: rerackData.user_id,
    user: userData,
    content: rerackData.content,
    images: [],
    likes_count: 0,
    comments_count: 0,
    reracks_count: 0,
    created_at: rerackData.created_at,
    is_rerack: rerackData.is_rerack,
    original_post: originalPostObj,
    quote_text: rerackData.quote_text,
    is_liked_by_current_user: false,
    impressions_count: 0
  }
}

/**
 * Search posts by content
 */
export const searchPosts = async (
  searchQuery: string,
  limit: number = 20,
  currentUserId?: string
): Promise<Post[]> => {
  if (!searchQuery.trim()) return []

  // Base query with search filter
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
    .ilike('content', `%${searchQuery}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

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
    .select('post_id, user_id')
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

  // Fetch saved status for current user
  let savedByCurrentUser = new Set<string>()
  if (currentUserId) {
    const { data: savedData } = await supabase
      .from('saved_posts')
      .select('post_id')
      .eq('user_id', currentUserId)
      .in('post_id', postIds)

    if (savedData) {
      savedByCurrentUser = new Set(savedData.map((item: any) => item.post_id))
    }
  }

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
          is_liked_by_current_user: likedByCurrentUser.has(originalData.id),
          is_saved_by_current_user: savedByCurrentUser.has(originalData.id),
          impressions_count: originalData.impressions_count || 0
        }
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
      is_saved_by_current_user: savedByCurrentUser.has(post.id),
      impressions_count: post.impressions_count || 0
    }
  })
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
            is_liked_by_current_user: false,
            impressions_count: postData.impressions_count || 0
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
                verification_type,
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
      is_liked_by_current_user: likedByCurrentUser.has(post.id),
      impressions_count: post.impressions_count || 0
    }
  })
}

/**
 * Get trending tags
 */
/**
 * Increment post impressions
 */
export const incrementImpressions = async (postId: string): Promise<void> => {
  const { error } = await supabase.rpc('increment_impressions', { p_post_id: postId })
  if (error) {
    console.error('Error incrementing impressions:', error)
  }
}

/**
 * Vote on a poll
 */
export const votePoll = async (pollId: string, optionId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('poll_votes')
    .insert({
      poll_id: pollId,
      option_id: optionId,
      user_id: userId
    })

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already voted on this poll');
    }
    throw new Error(`Failed to vote: ${error.message}`);
  }
}

/**
 * Get trending tags using RPC
 */
export const getTrends = async (limit: number = 5): Promise<{ tag: string; count: number }[]> => {
  try {
    const { data, error } = await supabase.rpc('get_trending_topics', {
      hours_lookback: 24,
      limit_count: limit
    });

    if (error) throw error;

    return data.map((item: any) => ({
      tag: item.tag.startsWith('#') ? item.tag : `#${item.tag}`,
      count: Number(item.count) // ensure number
    }));
  } catch (error) {
    console.error('Error fetching trends via RPC:', error);
    // Fallback to old method? Or return empty. Return empty for now to enforce new system.
    return [];
  }
}

/**
 * Get scheduled posts for a user
 */
export const getScheduledPosts = async (userId: string): Promise<Post[]> => {
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
      impressions_count,
      scheduled_for,
      poll_id,
      media_type,
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
    .eq('user_id', userId)
    .gt('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })

  if (postsError) {
    throw new Error(`Failed to fetch scheduled posts: ${postsError.message}`)
  }

  return postsData?.map((post: any) => ({
    id: post.id,
    user_id: post.user_id,
    user: Array.isArray(post.user) ? post.user[0] : post.user,
    content: post.content,
    images: post.post_images
      ?.sort((a: any, b: any) => a.position - b.position)
      .map((img: any) => img.image_url) || [],
    likes_count: 0,
    comments_count: 0,
    reracks_count: 0,
    created_at: post.created_at,
    is_rerack: post.is_rerack,
    scheduled_for: post.scheduled_for,
    poll_id: post.poll_id,
    media_type: post.media_type,
    impressions_count: post.impressions_count || 0,
    is_liked_by_current_user: false,
    is_saved_by_current_user: false
  })) || []
}


// ============================================
// VOICE NOTES (upload helper is above, near createPost)
// ============================================

/**
 * Create a post with a voice note attached
 */
export const createPostWithAudio = async (
  userId: string,
  content: string,
  audioBlob: Blob,
  audioDurationMs: number
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

  // Upload the voice note first
  const audioUrl = await uploadVoiceNote(userId, audioBlob)

  // Insert post into database with audio fields
  const { data: postData, error: postError } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      content: content.trim(),
      is_rerack: false,
      audio_url: audioUrl,
      audio_duration_ms: audioDurationMs,
      media_type: 'video' as any, // Using 'video' since 'audio' isn't in enum
      impressions_count: 0
    })
    .select()
    .single()

  if (postError) {
    throw new Error(`Failed to create post: ${postError.message}`)
  }

  // Extract and insert tags
  const tags = content.match(/#[\w]+/g) || []
  if (tags.length > 0) {
    const tagRecords = tags.map(tag => ({
      post_id: postData.id,
      tag: tag.substring(1).toLowerCase()
    }))

    await supabase.from('post_tags').insert(tagRecords)
  }

  // Fetch user data
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (userError) {
    throw new Error(`Failed to fetch user data: ${userError.message}`)
  }

  // Record successful action for rate limiting
  rateLimiter.recordAction(userId, 'post_creation')

  return {
    id: postData.id,
    user_id: postData.user_id,
    user: userData,
    content: postData.content,
    images: [],
    likes_count: 0,
    comments_count: 0,
    reracks_count: 0,
    created_at: postData.created_at,
    is_rerack: false,
    is_liked_by_current_user: false,
    audio_url: postData.audio_url,
    audio_duration_ms: postData.audio_duration_ms,
    impressions_count: 0
  }
}

/**
 * Delete a voice note from storage
 */
export const deleteVoiceNote = async (userId: string, audioUrl: string): Promise<void> => {
  // Extract filename from URL
  const urlParts = audioUrl.split('/')
  const filename = `${userId}/${urlParts[urlParts.length - 1]}`

  const { error } = await supabase.storage
    .from('voice-notes')
    .remove([filename])

  if (error) {
    console.error('Failed to delete voice note:', error)
  }
}
