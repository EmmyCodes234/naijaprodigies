# Implementation Plan

- [x] 1. Set up Supabase project and database schema






  - Create Supabase project and obtain credentials
  - Create database tables: users, posts, post_images, likes, comments, follows
  - Set up database views for posts_with_counts
  - Configure Supabase client in the React application
  - _Requirements: All requirements depend on database foundation_

- [ ]* 1.1 Write property test for database schema integrity
  - **Property 23: Cascade deletion integrity**
  - **Validates: Requirements 7.5**

- [ ] 2. Implement Row Level Security (RLS) policies
  - Create RLS policy for users table (users can read all, update own)
  - Create RLS policy for posts table (users can read all, insert own, update/delete own)
  - Create RLS policy for likes table (users can read all, insert own, delete own)
  - Create RLS policy for comments table (users can read all, insert own, delete own)
  - Create RLS policy for follows table (users can read all, insert own, delete own)
  - _Requirements: 7.1, 7.2, 7.3_

- [ ]* 2.1 Write property test for RLS enforcement
  - **Property 22: RLS policy enforcement**
  - **Validates: Requirements 7.1, 7.2**

- [ ]* 2.2 Write property test for post ownership authorization
  - **Property 21: Post ownership authorization**
  - **Validates: Requirements 7.3**

- [x] 3. Create service layer structure





  - Create services directory structure
  - Implement supabaseClient.ts with initialization
  - Create postService.ts with interface definitions
  - Create userService.ts with interface definitions
  - Create followService.ts with interface definitions
  - Create imageService.ts with interface definitions
  - Create searchService.ts with interface definitions
  - _Requirements: Foundation for all features_

- [x] 4. Implement post creation functionality






  - Implement postService.createPost() method
  - Add character limit validation (280 chars)
  - Update CreatePost component to use postService
  - Add error handling for post creation failures
  - _Requirements: 1.1_

- [ ]* 4.1 Write property test for character limit enforcement
  - **Property 1: Post character limit enforcement**
  - **Validates: Requirements 1.1**

- [x] 5. Implement image upload functionality










  - Set up Supabase Storage bucket for post images
  - Implement imageService.uploadImage() method
  - Implement imageService.uploadImages() for multiple files
  - Add image count validation (1-4 images)
  - Update CreatePost component to handle image selection
  - Implement local image preview generation
  - Store image URLs in post_images table
  - _Requirements: 1.2, 1.3, 9.1_

- [ ]* 5.1 Write property test for image count validation
  - **Property 2: Image attachment count validation**
  - **Validates: Requirements 1.2**

- [ ]* 5.2 Write property test for image storage round-trip
  - **Property 3: Image storage round-trip**
  - **Validates: Requirements 1.3**

- [ ]* 5.3 Write property test for image preview generation
  - **Property 25: Image preview generation**
  - **Validates: Requirements 9.1**

- [x] 6. Implement hashtag and mention parsing









  - Create utility function to extract hashtags from post content
  - Create utility function to extract mentions from post content
  - Update post display to render hashtags as searchable links
  - Update post display to render mentions as profile links
  - Ensure hashtags and mentions are preserved in database
  - _Requirements: 1.4, 1.5_

- [ ]* 6.1 Write property test for hashtag preservation
  - **Property 4: Hashtag preservation**
  - **Validates: Requirements 1.4**

- [ ]* 6.2 Write property test for mention link generation
  - **Property 5: Mention link generation**
  - **Validates: Requirements 1.5**

- [x] 7. Implement feed display with chronological ordering





  - Implement postService.getPosts() with pagination
  - Update SocialFeed component to fetch posts from database
  - Implement reverse chronological ordering by created_at
  - Remove mock data from SocialFeed component
  - _Requirements: 2.1_

- [ ]* 7.1 Write property test for reverse chronological ordering
  - **Property 6: Reverse chronological ordering**
  - **Validates: Requirements 2.1**

- [x] 8. Implement infinite scroll pagination



  - Add scroll event listener to SocialFeed component
  - Implement loadMore functionality with offset-based pagination
  - Ensure no duplicate posts across pagination requests
  - Add loading indicator for pagination
  - _Requirements: 2.2_

- [ ]* 8.1 Write property test for pagination consistency
  - **Property 7: Pagination consistency**
  - **Validates: Requirements 2.2**

- [x] 9. Implement real-time post updates
  - Set up Supabase Realtime subscription to posts table
  - Update SocialFeed to subscribe on mount and unsubscribe on unmount
  - Handle INSERT events to prepend new posts to feed
  - Implement optimistic UI updates for post creation
  - _Requirements: 2.3, 2.4_

- [x] 10. Implement like functionality








  - Implement postService.likePost() method
  - Implement postService.unlikePost() method
  - Update PostCard component to handle like/unlike actions
  - Implement optimistic UI updates for likes
  - Add real-time like count updates
  - _Requirements: 3.1_

- [ ]* 10.1 Write property test for like action
  - **Property 8: Like action increments count**
  - **Validates: Requirements 3.1**

- [x] 11. Implement comment functionality





  - Implement postService.createComment() method
  - Update PostCard to show comment input interface
  - Implement threaded comment support with parent_comment_id
  - Display comments under posts with proper threading
  - Add real-time comment updates
  - _Requirements: 3.2, 3.3_

- [ ]* 11.1 Write property test for comment threading
  - **Property 9: Comment threading support**
  - **Validates: Requirements 3.3**

- [x] 12. Implement re-rack functionality





  - Implement postService.createReRack() method for simple re-rack
  - Implement postService.createReRack() with quote text for quote re-rack
  - Add re-rack button UI with options for simple/quote
  - Display re-racked posts with original post reference
  - Update engagement counts to include re-racks
  - _Requirements: 3.4, 3.5, 3.6_

- [ ]* 12.1 Write property test for simple re-rack
  - **Property 10: Simple re-rack creates reference**
  - **Validates: Requirements 3.5**

- [ ]* 12.2 Write property test for quote re-rack
  - **Property 11: Quote re-rack includes commentary**
  - **Validates: Requirements 3.6**

- [x] 13. Implement engagement count display





  - Update PostCard to fetch and display accurate counts
  - Implement real-time updates for all engagement metrics
  - Ensure counts reflect database state
  - _Requirements: 3.7_

- [ ]* 13.1 Write property test for engagement counts
  - **Property 12: Engagement counts reflect state**
  - **Validates: Requirements 3.7**

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement user profile page





  - Create UserProfile page component
  - Implement userService.getUserById() method
  - Display user avatar, bio, and rank
  - Add tabs for Posts, Media, and Liked content
  - Implement routing to user profiles
  - _Requirements: 4.1, 4.4_

- [x] 16. Implement follower/following display





  - Implement userService.getFollowers() method
  - Implement userService.getFollowing() method
  - Display follower and following counts on profile
  - Create modal component to list followers/following
  - _Requirements: 4.2, 4.3_

- [ ]* 16.1 Write property test for follower counts
  - **Property 13: Follower counts accuracy**
  - **Validates: Requirements 4.2**

- [x] 17. Implement profile editing





  - Create profile edit form component
  - Implement userService.updateUserProfile() method
  - Allow editing of avatar, bio, and rank
  - Add validation for profile fields
  - Implement optimistic UI updates
  - _Requirements: 4.5_

- [ ]* 17.1 Write property test for profile edit persistence
  - **Property 14: Profile edit persistence**
  - **Validates: Requirements 4.5**

- [x] 18. Implement follow/unfollow functionality





  - Implement followService.followUser() method
  - Implement followService.unfollowUser() method
  - Implement followService.isFollowing() method
  - Create FollowButton component
  - Update follower counts in real-time
  - Prevent self-follow with database constraint
  - _Requirements: 5.1, 5.2, 5.4_

- [ ]* 18.1 Write property test for follow action
  - **Property 15: Follow action creates relationship**
  - **Validates: Requirements 5.1**

- [ ]* 18.2 Write property test for follow-unfollow round-trip
  - **Property 16: Follow-unfollow round-trip**
  - **Validates: Requirements 5.2**

- [ ]* 18.3 Write property test for follow button state
  - **Property 17: Follow button state consistency**
  - **Validates: Requirements 5.4**

- [x] 19. Implement search functionality






  - Implement searchService.searchUsers() method
  - Implement searchService.searchPosts() method
  - Implement searchService.searchHashtags() method
  - Update SearchBar component to use search service
  - Prioritize exact username matches in results
  - Display categorized search results
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 19.1 Write property test for search completeness
  - **Property 18: Search completeness**
  - **Validates: Requirements 6.1, 6.4**

- [ ]* 19.2 Write property test for username prioritization
  - **Property 19: Username search prioritization**
  - **Validates: Requirements 6.2**

- [ ]* 19.3 Write property test for hashtag search
  - **Property 20: Hashtag search completeness**
  - **Validates: Requirements 6.3**

- [x] 20. Implement rate limiting





  - Create rate limiting middleware/utility
  - Apply rate limiting to post creation (e.g., 10 posts per hour)
  - Apply rate limiting to follow/unfollow actions (e.g., 50 per hour)
  - Return appropriate error messages when limits exceeded
  - _Requirements: 8.1, 8.2, 8.3_

- [ ]* 20.1 Write property test for rate limiting
  - **Property 24: Rate limiting enforcement**
  - **Validates: Requirements 8.1, 8.2**

- [x] 21. Implement direct messaging database schema





  - Create conversations table
  - Create conversation_participants table
  - Create messages table
  - Set up RLS policies for messaging tables
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 22. Implement direct messaging functionality





  - Create messageService.ts with interface definitions
  - Implement messageService.sendMessage() method
  - Implement messageService.getConversations() method
  - Implement messageService.getMessages() method
  - Add character limit validation (1000 chars)
  - _Requirements: 10.2, 10.5_

- [ ]* 22.1 Write property test for message delivery
  - **Property 26: Direct message delivery**
  - **Validates: Requirements 10.2**

- [ ]* 22.2 Write property test for message character limit
  - **Property 29: Message character limit**
  - **Validates: Requirements 10.5**

- [x] 23. Implement messaging UI components





  - Create Messages page component
  - Create ConversationList component
  - Create MessageThread component
  - Implement real-time message updates with Supabase Realtime
  - Add unread message indicator
  - Order conversations by most recent message
  - _Requirements: 10.1, 10.3, 10.4_

- [ ]* 23.1 Write property test for unread indicator
  - **Property 27: Unread message indicator**
  - **Validates: Requirements 10.3**

- [ ]* 23.2 Write property test for conversation ordering
  - **Property 28: Conversation ordering**
  - **Validates: Requirements 10.4**

- [x] 24. Implement notifications database schema





  - Create notifications table
  - Create database triggers for automatic notification creation
  - Set up RLS policies for notifications table
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 25. Implement notifications functionality
  - Create notificationService.ts with interface definitions
  - Implement notificationService.getNotifications() method
  - Implement notificationService.markAsRead() method
  - Create database triggers for like, comment, follow events
  - _Requirements: 11.1, 11.2, 11.3, 11.5_

- [ ]* 25.1 Write property test for notification creation
  - **Property 30: Notification creation on engagement**
  - **Validates: Requirements 11.1, 11.2, 11.3**

- [ ]* 25.2 Write property test for notification read state
  - **Property 32: Notification read state**
  - **Validates: Requirements 11.5**

- [ ] 26. Implement notifications UI
  - Create Notifications page component
  - Display notifications in reverse chronological order
  - Add unread notification indicator
  - Implement real-time notification updates
  - Mark notifications as read when viewed
  - _Requirements: 11.4, 11.5_

- [ ]* 26.1 Write property test for notification ordering
  - **Property 31: Notification ordering**
  - **Validates: Requirements 11.4**

- [ ] 27. Implement bookmarks functionality
  - Create bookmarks table
  - Create bookmarkService.ts with interface definitions
  - Implement bookmarkService.bookmarkPost() method
  - Implement bookmarkService.unbookmarkPost() method
  - Implement bookmarkService.getBookmarks() method
  - Set up cascade deletion for bookmarks
  - _Requirements: 12.1, 12.2, 12.3, 12.5_

- [ ]* 27.1 Write property test for bookmark creation
  - **Property 33: Bookmark creation**
  - **Validates: Requirements 12.1**

- [ ]* 27.2 Write property test for bookmark toggle
  - **Property 35: Bookmark toggle round-trip**
  - **Validates: Requirements 12.3**

- [ ]* 27.3 Write property test for bookmark cascade deletion
  - **Property 37: Bookmark cascade deletion**
  - **Validates: Requirements 12.5**

- [ ] 28. Implement bookmarks UI
  - Add bookmark button to PostCard component
  - Create Bookmarks page component
  - Display bookmarked posts in reverse chronological order
  - Update bookmark button state based on bookmark status
  - _Requirements: 12.2, 12.4_

- [ ]* 28.1 Write property test for bookmark ordering
  - **Property 34: Bookmark ordering**
  - **Validates: Requirements 12.2**

- [ ]* 28.2 Write property test for bookmark button state
  - **Property 36: Bookmark button state**
  - **Validates: Requirements 12.4**

- [ ] 29. Implement muting and blocking database schema
  - Create mutes table
  - Create blocks table
  - Set up RLS policies for mutes and blocks tables
  - _Requirements: 13.1, 13.2, 13.3_

- [ ] 30. Implement muting and blocking functionality
  - Create muteBlockService.ts with interface definitions
  - Implement muteBlockService.muteUser() method
  - Implement muteBlockService.unmuteUser() method
  - Implement muteBlockService.blockUser() method
  - Implement muteBlockService.unblockUser() method
  - Update feed queries to filter muted users
  - Update RLS policies to prevent blocked users from viewing content
  - Remove follow relationships when blocking
  - _Requirements: 13.1, 13.2, 13.3_

- [ ]* 30.1 Write property test for mute filtering
  - **Property 38: Mute filters feed**
  - **Validates: Requirements 13.1**

- [ ]* 30.2 Write property test for block access prevention
  - **Property 39: Block prevents access**
  - **Validates: Requirements 13.2**

- [ ]* 30.3 Write property test for block removes follows
  - **Property 40: Block removes follows**
  - **Validates: Requirements 13.3**

- [ ] 31. Implement muting and blocking UI
  - Add mute/block options to user profile menu
  - Create Settings page with muted/blocked users lists
  - Add unmute/unblock functionality
  - Display appropriate message when blocked user tries to view profile
  - _Requirements: 13.4, 13.5_

- [ ] 32. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 33. Implement "For You" algorithm
  - Create PostgreSQL function to calculate post relevance scores
  - Implement scoring based on engagement metrics
  - Implement scoring based on user's followed users
  - Implement scoring based on user's interaction history
  - Implement recency decay factor
  - Create postService.getForYouFeed() method
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [ ]* 33.1 Write property test for For You ranking
  - **Property 41: For You feed relevance ranking**
  - **Validates: Requirements 14.1, 14.2, 14.3, 14.4**

- [ ] 34. Implement algorithm adaptation
  - Update relevance calculation to incorporate new interactions
  - Implement user preference tracking
  - Add feed view toggle between Chronological and For You
  - _Requirements: 14.5, 2.5_

- [ ]* 34.1 Write property test for algorithm adaptation
  - **Property 42: Algorithm adaptation**
  - **Validates: Requirements 14.5**

- [ ] 35. Implement trending hashtags database schema
  - Create hashtag_usage table
  - Create index for efficient trending calculation
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 36. Implement trending hashtags functionality
  - Create trendingService.ts with interface definitions
  - Implement trendingService.getTrendingHashtags() method
  - Calculate trends based on 24-hour rolling window
  - Implement caching for trending results (15 min TTL)
  - Extract and store hashtags when posts are created
  - _Requirements: 15.1, 15.2, 15.5_

- [ ]* 36.1 Write property test for trending calculation
  - **Property 43: Trending hashtags calculation**
  - **Validates: Requirements 15.1, 15.2**

- [ ]* 36.2 Write property test for trending expiration
  - **Property 46: Trending expiration**
  - **Validates: Requirements 15.5**

- [ ] 37. Implement trending hashtags UI
  - Update Trends widget to display real trending hashtags
  - Display post counts for each trending hashtag
  - Make trending hashtags clickable to show posts
  - _Requirements: 15.3, 15.4_

- [ ]* 37.1 Write property test for trending hashtag click
  - **Property 44: Trending hashtag click**
  - **Validates: Requirements 15.3**

- [ ]* 37.2 Write property test for trending counts
  - **Property 45: Trending hashtag counts**
  - **Validates: Requirements 15.4**

- [ ] 38. Implement user verification functionality
  - Add verified field to users table (already exists)
  - Create admin service for verification management
  - Implement verificationService.verifyUser() method
  - Implement verificationService.unverifyUser() method
  - _Requirements: 16.1, 16.4_

- [ ]* 38.1 Write property test for verification status
  - **Property 47: Verification status persistence**
  - **Validates: Requirements 16.1, 16.2**

- [ ]* 38.2 Write property test for verification removal
  - **Property 48: Verification removal**
  - **Validates: Requirements 16.4**

- [ ] 39. Update UI to display verification badges
  - Ensure PostCard displays verification badge for verified users
  - Ensure UserProfile displays verification badge
  - Ensure search results display verification badge
  - _Requirements: 16.2, 16.3_

- [ ] 40. Implement post analytics database schema
  - Create post_views table
  - Create post_analytics view
  - Set up indexes for efficient analytics queries
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 41. Implement post analytics functionality
  - Create analyticsService.ts with interface definitions
  - Implement analyticsService.trackPostView() method
  - Implement analyticsService.getPostAnalytics() method
  - Implement analyticsService.getUserAnalytics() method
  - Track unique views per post
  - Calculate engagement scores
  - Implement time-series aggregation for trends
  - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [ ]* 41.1 Write property test for post analytics accuracy
  - **Property 49: Post analytics accuracy**
  - **Validates: Requirements 17.1**

- [ ]* 41.2 Write property test for profile analytics aggregation
  - **Property 50: Profile analytics aggregation**
  - **Validates: Requirements 17.2**

- [ ]* 41.3 Write property test for time-series accuracy
  - **Property 51: Analytics time-series accuracy**
  - **Validates: Requirements 17.3**

- [ ]* 41.4 Write property test for unique reach counting
  - **Property 52: Unique reach counting**
  - **Validates: Requirements 17.4**

- [ ] 42. Implement post analytics UI
  - Create Analytics page component
  - Display post-level analytics for user's own posts
  - Display profile-level aggregate analytics
  - Show engagement trends over time with charts
  - Implement real-time analytics updates
  - Restrict analytics viewing to post authors only
  - _Requirements: 17.1, 17.2, 17.3, 17.5_

- [ ]* 42.1 Write property test for real-time analytics updates
  - **Property 53: Real-time analytics updates**
  - **Validates: Requirements 17.5**

- [ ] 43. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 44. Polish and optimization
  - Add loading states to all async operations
  - Implement error boundaries for graceful error handling
  - Optimize database queries with proper indexes
  - Add animations and transitions for better UX
  - Implement retry logic for failed network requests
  - Add comprehensive error messages
  - Test all features end-to-end
  - _Requirements: All requirements_
