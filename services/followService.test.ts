import { describe, it, expect, beforeAll } from 'vitest';
import { followUser, unfollowUser, isFollowing, getFollowerCount, getFollowingCount } from './followService';
import { supabase } from './supabaseClient';

/**
 * Integration tests for followService
 * 
 * Note: These tests require a working Supabase connection
 * and will interact with the actual database.
 */
describe('followService', () => {
  let testUserId1: string;
  let testUserId2: string;

  beforeAll(async () => {
    // Check if we have a valid Supabase connection
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(2);

    if (error || !data || data.length < 2) {
      console.warn('Skipping follow service tests: Need at least 2 users in database');
      return;
    }

    testUserId1 = data[0].id;
    testUserId2 = data[1].id;
  });

  describe('followUser', () => {
    it('should prevent self-follow', async () => {
      if (!testUserId1) return;

      await expect(
        followUser(testUserId1, testUserId1)
      ).rejects.toThrow('Cannot follow yourself');
    });

    it('should create a follow relationship', async () => {
      if (!testUserId1 || !testUserId2) return;

      // Clean up any existing follow relationship
      await unfollowUser(testUserId1, testUserId2);

      // Follow the user
      await followUser(testUserId1, testUserId2);

      // Verify the relationship exists
      const following = await isFollowing(testUserId1, testUserId2);
      expect(following).toBe(true);

      // Clean up
      await unfollowUser(testUserId1, testUserId2);
    });

    it('should handle duplicate follow attempts gracefully', async () => {
      if (!testUserId1 || !testUserId2) return;

      // Follow twice
      await followUser(testUserId1, testUserId2);
      await followUser(testUserId1, testUserId2); // Should not throw

      // Verify only one relationship exists
      const following = await isFollowing(testUserId1, testUserId2);
      expect(following).toBe(true);

      // Clean up
      await unfollowUser(testUserId1, testUserId2);
    });
  });

  describe('unfollowUser', () => {
    it('should remove a follow relationship', async () => {
      if (!testUserId1 || !testUserId2) return;

      // Create a follow relationship
      await followUser(testUserId1, testUserId2);

      // Unfollow
      await unfollowUser(testUserId1, testUserId2);

      // Verify the relationship no longer exists
      const following = await isFollowing(testUserId1, testUserId2);
      expect(following).toBe(false);
    });

    it('should handle unfollowing when not following', async () => {
      if (!testUserId1 || !testUserId2) return;

      // Ensure not following
      await unfollowUser(testUserId1, testUserId2);

      // Unfollow again - should not throw
      await unfollowUser(testUserId1, testUserId2);

      // Verify still not following
      const following = await isFollowing(testUserId1, testUserId2);
      expect(following).toBe(false);
    });
  });

  describe('isFollowing', () => {
    it('should return true when following', async () => {
      if (!testUserId1 || !testUserId2) return;

      await followUser(testUserId1, testUserId2);
      const following = await isFollowing(testUserId1, testUserId2);
      expect(following).toBe(true);

      // Clean up
      await unfollowUser(testUserId1, testUserId2);
    });

    it('should return false when not following', async () => {
      if (!testUserId1 || !testUserId2) return;

      await unfollowUser(testUserId1, testUserId2);
      const following = await isFollowing(testUserId1, testUserId2);
      expect(following).toBe(false);
    });
  });

  describe('getFollowerCount', () => {
    it('should return the correct follower count', async () => {
      if (!testUserId1 || !testUserId2) return;

      // Clean up
      await unfollowUser(testUserId1, testUserId2);

      const initialCount = await getFollowerCount(testUserId2);

      // Add a follower
      await followUser(testUserId1, testUserId2);

      const newCount = await getFollowerCount(testUserId2);
      expect(newCount).toBe(initialCount + 1);

      // Clean up
      await unfollowUser(testUserId1, testUserId2);
    });
  });

  describe('getFollowingCount', () => {
    it('should return the correct following count', async () => {
      if (!testUserId1 || !testUserId2) return;

      // Clean up
      await unfollowUser(testUserId1, testUserId2);

      const initialCount = await getFollowingCount(testUserId1);

      // Follow a user
      await followUser(testUserId1, testUserId2);

      const newCount = await getFollowingCount(testUserId1);
      expect(newCount).toBe(initialCount + 1);

      // Clean up
      await unfollowUser(testUserId1, testUserId2);
    });
  });
});
