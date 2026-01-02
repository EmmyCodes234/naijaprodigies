import { describe, it, expect, beforeEach } from 'vitest'
import rateLimiter, { RateLimitError, formatTimeUntilReset } from './rateLimiter'

describe('RateLimiter', () => {
  beforeEach(() => {
    // Clear all rate limit data before each test
    rateLimiter.clearAll()
  })

  describe('Post Creation Rate Limiting', () => {
    it('should allow posts within the limit', () => {
      const userId = 'user-1'
      
      // Should allow up to 10 posts
      for (let i = 0; i < 10; i++) {
        expect(rateLimiter.checkLimit(userId, 'post_creation')).toBe(true)
        rateLimiter.recordAction(userId, 'post_creation')
      }
    })

    it('should block posts after exceeding the limit', () => {
      const userId = 'user-2'
      
      // Record 10 posts (the limit)
      for (let i = 0; i < 10; i++) {
        rateLimiter.checkLimit(userId, 'post_creation')
        rateLimiter.recordAction(userId, 'post_creation')
      }
      
      // 11th post should be blocked
      expect(rateLimiter.checkLimit(userId, 'post_creation')).toBe(false)
    })

    it('should return correct remaining requests', () => {
      const userId = 'user-3'
      
      expect(rateLimiter.getRemainingRequests(userId, 'post_creation')).toBe(10)
      
      rateLimiter.recordAction(userId, 'post_creation')
      expect(rateLimiter.getRemainingRequests(userId, 'post_creation')).toBe(9)
      
      rateLimiter.recordAction(userId, 'post_creation')
      expect(rateLimiter.getRemainingRequests(userId, 'post_creation')).toBe(8)
    })

    it('should track different users independently', () => {
      const user1 = 'user-4'
      const user2 = 'user-5'
      
      // User 1 makes 10 posts
      for (let i = 0; i < 10; i++) {
        rateLimiter.recordAction(user1, 'post_creation')
      }
      
      // User 1 should be blocked
      expect(rateLimiter.checkLimit(user1, 'post_creation')).toBe(false)
      
      // User 2 should still be allowed
      expect(rateLimiter.checkLimit(user2, 'post_creation')).toBe(true)
    })
  })

  describe('Follow Action Rate Limiting', () => {
    it('should allow follow actions within the limit', () => {
      const userId = 'user-6'
      
      // Should allow up to 50 follow actions
      for (let i = 0; i < 50; i++) {
        expect(rateLimiter.checkLimit(userId, 'follow_action')).toBe(true)
        rateLimiter.recordAction(userId, 'follow_action')
      }
    })

    it('should block follow actions after exceeding the limit', () => {
      const userId = 'user-7'
      
      // Record 50 follow actions (the limit)
      for (let i = 0; i < 50; i++) {
        rateLimiter.checkLimit(userId, 'follow_action')
        rateLimiter.recordAction(userId, 'follow_action')
      }
      
      // 51st action should be blocked
      expect(rateLimiter.checkLimit(userId, 'follow_action')).toBe(false)
    })

    it('should return correct remaining requests', () => {
      const userId = 'user-8'
      
      expect(rateLimiter.getRemainingRequests(userId, 'follow_action')).toBe(50)
      
      rateLimiter.recordAction(userId, 'follow_action')
      expect(rateLimiter.getRemainingRequests(userId, 'follow_action')).toBe(49)
    })
  })

  describe('Time Window Management', () => {
    it('should return time until reset when limit is exceeded', () => {
      const userId = 'user-9'
      
      // Record 10 posts
      for (let i = 0; i < 10; i++) {
        rateLimiter.recordAction(userId, 'post_creation')
      }
      
      // Should have a positive time until reset
      const timeUntilReset = rateLimiter.getTimeUntilReset(userId, 'post_creation')
      expect(timeUntilReset).toBeGreaterThan(0)
      expect(timeUntilReset).toBeLessThanOrEqual(60 * 60 * 1000) // Less than or equal to 1 hour
    })

    it('should return 0 time until reset when under limit', () => {
      const userId = 'user-10'
      
      // Record only 5 posts
      for (let i = 0; i < 5; i++) {
        rateLimiter.recordAction(userId, 'post_creation')
      }
      
      // Should have no wait time
      expect(rateLimiter.getTimeUntilReset(userId, 'post_creation')).toBe(0)
    })
  })

  describe('User Management', () => {
    it('should clear rate limit data for a specific user', () => {
      const userId = 'user-11'
      
      // Record some actions
      for (let i = 0; i < 5; i++) {
        rateLimiter.recordAction(userId, 'post_creation')
      }
      
      expect(rateLimiter.getRemainingRequests(userId, 'post_creation')).toBe(5)
      
      // Clear user data
      rateLimiter.clearUser(userId)
      
      // Should be reset to full limit
      expect(rateLimiter.getRemainingRequests(userId, 'post_creation')).toBe(10)
    })

    it('should clear all rate limit data', () => {
      const user1 = 'user-12'
      const user2 = 'user-13'
      
      // Record actions for multiple users
      rateLimiter.recordAction(user1, 'post_creation')
      rateLimiter.recordAction(user2, 'follow_action')
      
      expect(rateLimiter.getRemainingRequests(user1, 'post_creation')).toBe(9)
      expect(rateLimiter.getRemainingRequests(user2, 'follow_action')).toBe(49)
      
      // Clear all data
      rateLimiter.clearAll()
      
      // Should be reset to full limits
      expect(rateLimiter.getRemainingRequests(user1, 'post_creation')).toBe(10)
      expect(rateLimiter.getRemainingRequests(user2, 'follow_action')).toBe(50)
    })
  })

  describe('RateLimitError', () => {
    it('should create error with correct properties', () => {
      const error = new RateLimitError(
        'Rate limit exceeded',
        'post_creation',
        3600000
      )
      
      expect(error.message).toBe('Rate limit exceeded')
      expect(error.name).toBe('RateLimitError')
      expect(error.actionType).toBe('post_creation')
      expect(error.retryAfter).toBe(3600000)
    })
  })

  describe('formatTimeUntilReset', () => {
    it('should format seconds correctly', () => {
      expect(formatTimeUntilReset(1000)).toBe('1 second')
      expect(formatTimeUntilReset(5000)).toBe('5 seconds')
      expect(formatTimeUntilReset(30000)).toBe('30 seconds')
    })

    it('should format minutes correctly', () => {
      expect(formatTimeUntilReset(60000)).toBe('1 minute')
      expect(formatTimeUntilReset(120000)).toBe('2 minutes')
      expect(formatTimeUntilReset(1800000)).toBe('30 minutes')
    })

    it('should format hours correctly', () => {
      expect(formatTimeUntilReset(3600000)).toBe('1 hour')
      expect(formatTimeUntilReset(7200000)).toBe('2 hours')
    })

    it('should round up partial units', () => {
      expect(formatTimeUntilReset(1500)).toBe('2 seconds')
      expect(formatTimeUntilReset(90000)).toBe('2 minutes')
      expect(formatTimeUntilReset(5400000)).toBe('2 hours')
    })
  })

  describe('Action Type Isolation', () => {
    it('should track post_creation and follow_action independently', () => {
      const userId = 'user-14'
      
      // Max out post creation
      for (let i = 0; i < 10; i++) {
        rateLimiter.recordAction(userId, 'post_creation')
      }
      
      // Post creation should be blocked
      expect(rateLimiter.checkLimit(userId, 'post_creation')).toBe(false)
      
      // Follow actions should still be allowed
      expect(rateLimiter.checkLimit(userId, 'follow_action')).toBe(true)
      expect(rateLimiter.getRemainingRequests(userId, 'follow_action')).toBe(50)
    })
  })
})
