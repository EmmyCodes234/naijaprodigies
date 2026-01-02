/**
 * Rate Limiter Utility
 * Implements client-side rate limiting for post creation and follow/unfollow actions
 * 
 * Note: This is a client-side implementation. For production, server-side rate limiting
 * should also be implemented using Supabase Edge Functions or a backend API.
 */

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitEntry {
  timestamps: number[]
}

class RateLimiter {
  private storage: Map<string, RateLimitEntry>
  private configs: Map<string, RateLimitConfig>

  constructor() {
    this.storage = new Map()
    this.configs = new Map()
  }

  /**
   * Configure rate limit for a specific action type
   */
  configure(actionType: string, maxRequests: number, windowMs: number): void {
    this.configs.set(actionType, { maxRequests, windowMs })
  }

  /**
   * Check if an action is allowed for a user
   * Returns true if allowed, false if rate limit exceeded
   */
  checkLimit(userId: string, actionType: string): boolean {
    const config = this.configs.get(actionType)
    if (!config) {
      throw new Error(`Rate limit not configured for action type: ${actionType}`)
    }

    const key = `${userId}:${actionType}`
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Get or create entry for this user-action combination
    let entry = this.storage.get(key)
    if (!entry) {
      entry = { timestamps: [] }
      this.storage.set(key, entry)
    }

    // Remove timestamps outside the current window
    entry.timestamps = entry.timestamps.filter(ts => ts > windowStart)

    // Check if limit is exceeded
    if (entry.timestamps.length >= config.maxRequests) {
      return false
    }

    return true
  }

  /**
   * Record an action for a user
   * Should be called after the action is successfully performed
   */
  recordAction(userId: string, actionType: string): void {
    const key = `${userId}:${actionType}`
    const now = Date.now()

    let entry = this.storage.get(key)
    if (!entry) {
      entry = { timestamps: [] }
      this.storage.set(key, entry)
    }

    entry.timestamps.push(now)
  }

  /**
   * Get remaining requests for a user-action combination
   */
  getRemainingRequests(userId: string, actionType: string): number {
    const config = this.configs.get(actionType)
    if (!config) {
      throw new Error(`Rate limit not configured for action type: ${actionType}`)
    }

    const key = `${userId}:${actionType}`
    const now = Date.now()
    const windowStart = now - config.windowMs

    const entry = this.storage.get(key)
    if (!entry) {
      return config.maxRequests
    }

    // Count timestamps within the current window
    const recentRequests = entry.timestamps.filter(ts => ts > windowStart).length
    return Math.max(0, config.maxRequests - recentRequests)
  }

  /**
   * Get time until next request is allowed (in milliseconds)
   * Returns 0 if requests are currently allowed
   */
  getTimeUntilReset(userId: string, actionType: string): number {
    const config = this.configs.get(actionType)
    if (!config) {
      throw new Error(`Rate limit not configured for action type: ${actionType}`)
    }

    const key = `${userId}:${actionType}`
    const now = Date.now()
    const windowStart = now - config.windowMs

    const entry = this.storage.get(key)
    if (!entry || entry.timestamps.length === 0) {
      return 0
    }

    // Remove timestamps outside the current window
    entry.timestamps = entry.timestamps.filter(ts => ts > windowStart)

    // If under limit, no wait time
    if (entry.timestamps.length < config.maxRequests) {
      return 0
    }

    // Calculate when the oldest timestamp will expire
    const oldestTimestamp = Math.min(...entry.timestamps)
    const resetTime = oldestTimestamp + config.windowMs
    return Math.max(0, resetTime - now)
  }

  /**
   * Clear all rate limit data for a user
   */
  clearUser(userId: string): void {
    const keysToDelete: string[] = []
    this.storage.forEach((_, key) => {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.storage.delete(key))
  }

  /**
   * Clear all rate limit data
   */
  clearAll(): void {
    this.storage.clear()
  }
}

// Singleton instance
const rateLimiter = new RateLimiter()

// Configure rate limits according to requirements
// 10 posts per hour
rateLimiter.configure('post_creation', 10, 60 * 60 * 1000)

// 50 follow/unfollow actions per hour
rateLimiter.configure('follow_action', 50, 60 * 60 * 1000)

export default rateLimiter

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
  public readonly retryAfter: number
  public readonly actionType: string

  constructor(message: string, actionType: string, retryAfter: number) {
    super(message)
    this.name = 'RateLimitError'
    this.actionType = actionType
    this.retryAfter = retryAfter
  }
}

/**
 * Helper function to format time until reset
 */
export function formatTimeUntilReset(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000)
  
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }
  
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
  
  const hours = Math.ceil(minutes / 60)
  return `${hours} hour${hours !== 1 ? 's' : ''}`
}
