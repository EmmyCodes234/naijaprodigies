import { describe, it, expect, beforeEach, vi } from 'vitest'
import rateLimiter, { RateLimitError } from '../utils/rateLimiter'
import * as postService from './postService'
import * as followService from './followService'

// Mock Supabase client
vi.mock('./supabaseClient', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'posts') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { 
                  id: 'post-1', 
                  user_id: 'user-1', 
                  content: 'Test post',
                  created_at: new Date().toISOString(),
                  is_rerack: false
                }, 
                error: null 
              }))
            }))
          }))
        }
      } else if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { 
                  id: 'user-1', 
                  handle: 'testuser',
                  name: 'Test User',
                  avatar: null,
                  bio: null,
                  rank: null,
                  verified: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }, 
                error: null 
              }))
            }))
          }))
        }
      } else if (table === 'post_images') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          })),
          insert: vi.fn(() => Promise.resolve({ error: null }))
        }
      } else if (table === 'follows') {
        return {
          insert: vi.fn(() => Promise.resolve({ error: null })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
          }))
        }
      }
      return {}
    })
  }
}))

describe('Rate Limiting Integration Tests', () => {
  beforeEach(() => {
    // Clear rate limiter before each test
    rateLimiter.clearAll()
  })

  describe('Post Creation Rate Limiting', () => {
    it('should allow creating posts within the limit', async () => {
      const userId = 'user-test-1'
      
      // Should successfully create 10 posts
      for (let i = 0; i < 10; i++) {
        await expect(
          postService.createPost(userId, `Test post ${i}`)
        ).resolves.toBeDefined()
      }
    })

    it('should throw RateLimitError when exceeding post creation limit', async () => {
      const userId = 'user-test-2'
      
      // Create 10 posts (the limit)
      for (let i = 0; i < 10; i++) {
        await postService.createPost(userId, `Test post ${i}`)
      }
      
      // 11th post should throw RateLimitError
      await expect(
        postService.createPost(userId, 'This should fail')
      ).rejects.toThrow(RateLimitError)
    })

    it('should include helpful error message with time until reset', async () => {
      const userId = 'user-test-3'
      
      // Create 10 posts
      for (let i = 0; i < 10; i++) {
        await postService.createPost(userId, `Test post ${i}`)
      }
      
      // Try to create 11th post
      try {
        await postService.createPost(userId, 'This should fail')
        expect.fail('Should have thrown RateLimitError')
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError)
        if (error instanceof RateLimitError) {
          expect(error.message).toContain('Rate limit exceeded')
          expect(error.message).toContain('10 posts per hour')
          expect(error.actionType).toBe('post_creation')
          expect(error.retryAfter).toBeGreaterThan(0)
        }
      }
    })

    it('should track rate limits per user independently', async () => {
      const user1 = 'user-test-4'
      const user2 = 'user-test-5'
      
      // User 1 creates 10 posts
      for (let i = 0; i < 10; i++) {
        await postService.createPost(user1, `User 1 post ${i}`)
      }
      
      // User 1 should be rate limited
      await expect(
        postService.createPost(user1, 'Should fail')
      ).rejects.toThrow(RateLimitError)
      
      // User 2 should still be able to post
      await expect(
        postService.createPost(user2, 'User 2 post')
      ).resolves.toBeDefined()
    })
  })

  describe('Follow Action Rate Limiting', () => {
    it('should allow follow actions within the limit', async () => {
      const followerId = 'user-test-6'
      
      // Should successfully perform 50 follow actions
      for (let i = 0; i < 50; i++) {
        await expect(
          followService.followUser(followerId, `target-user-${i}`)
        ).resolves.toBeUndefined()
      }
    })

    it('should throw RateLimitError when exceeding follow action limit', async () => {
      const followerId = 'user-test-7'
      
      // Perform 50 follow actions (the limit)
      for (let i = 0; i < 50; i++) {
        await followService.followUser(followerId, `target-user-${i}`)
      }
      
      // 51st action should throw RateLimitError
      await expect(
        followService.followUser(followerId, 'target-user-51')
      ).rejects.toThrow(RateLimitError)
    })

    it('should throw RateLimitError when exceeding unfollow action limit', async () => {
      const followerId = 'user-test-8'
      
      // Perform 50 unfollow actions (the limit)
      for (let i = 0; i < 50; i++) {
        await followService.unfollowUser(followerId, `target-user-${i}`)
      }
      
      // 51st action should throw RateLimitError
      await expect(
        followService.unfollowUser(followerId, 'target-user-51')
      ).rejects.toThrow(RateLimitError)
    })

    it('should count follow and unfollow actions together', async () => {
      const followerId = 'user-test-9'
      
      // Perform 25 follow actions
      for (let i = 0; i < 25; i++) {
        await followService.followUser(followerId, `target-user-${i}`)
      }
      
      // Perform 25 unfollow actions
      for (let i = 0; i < 25; i++) {
        await followService.unfollowUser(followerId, `target-user-${i}`)
      }
      
      // 51st action (combined) should throw RateLimitError
      await expect(
        followService.followUser(followerId, 'target-user-51')
      ).rejects.toThrow(RateLimitError)
    })

    it('should include helpful error message for follow actions', async () => {
      const followerId = 'user-test-10'
      
      // Perform 50 follow actions
      for (let i = 0; i < 50; i++) {
        await followService.followUser(followerId, `target-user-${i}`)
      }
      
      // Try 51st action
      try {
        await followService.followUser(followerId, 'target-user-51')
        expect.fail('Should have thrown RateLimitError')
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError)
        if (error instanceof RateLimitError) {
          expect(error.message).toContain('Rate limit exceeded')
          expect(error.message).toContain('50 actions per hour')
          expect(error.actionType).toBe('follow_action')
          expect(error.retryAfter).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('Action Type Isolation', () => {
    it('should not affect follow actions when post limit is reached', async () => {
      const userId = 'user-test-11'
      
      // Max out post creation
      for (let i = 0; i < 10; i++) {
        await postService.createPost(userId, `Test post ${i}`)
      }
      
      // Post creation should be blocked
      await expect(
        postService.createPost(userId, 'Should fail')
      ).rejects.toThrow(RateLimitError)
      
      // Follow actions should still work
      await expect(
        followService.followUser(userId, 'target-user-1')
      ).resolves.toBeUndefined()
    })

    it('should not affect post creation when follow limit is reached', async () => {
      const userId = 'user-test-12'
      
      // Max out follow actions
      for (let i = 0; i < 50; i++) {
        await followService.followUser(userId, `target-user-${i}`)
      }
      
      // Follow actions should be blocked
      await expect(
        followService.followUser(userId, 'target-user-51')
      ).rejects.toThrow(RateLimitError)
      
      // Post creation should still work
      await expect(
        postService.createPost(userId, 'Test post')
      ).resolves.toBeDefined()
    })
  })
})
