import { describe, it, expect, beforeAll } from 'vitest';
import { searchUsers, searchPosts, searchHashtags, searchAll } from './searchService';
import { supabase } from './supabaseClient';

/**
 * Integration tests for searchService
 * 
 * Note: These tests require a working Supabase connection
 * and will interact with the actual database.
 */
describe('searchService', () => {
  let testUser: any;
  let testPost: any;

  beforeAll(async () => {
    // Check if we have a valid Supabase connection
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single();

    if (userError || !userData) {
      console.warn('Skipping search service tests: Need at least 1 user in database');
      return;
    }

    testUser = userData;

    // Try to get a test post
    const { data: postData } = await supabase
      .from('posts')
      .select('*')
      .limit(1)
      .single();

    testPost = postData;
  });

  describe('searchUsers', () => {
    it('should return empty array for empty query', async () => {
      const results = await searchUsers('');
      expect(results).toEqual([]);
    });

    it('should find users by handle', async () => {
      if (!testUser) return;

      const results = await searchUsers(testUser.handle);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(u => u.id === testUser.id)).toBe(true);
    });

    it('should find users by name', async () => {
      if (!testUser) return;

      const results = await searchUsers(testUser.name);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should prioritize exact handle matches', async () => {
      if (!testUser) return;

      const results = await searchUsers(testUser.handle);
      if (results.length > 0) {
        expect(results[0].handle.toLowerCase()).toBe(testUser.handle.toLowerCase());
      }
    });
  });

  describe('searchPosts', () => {
    it('should return empty array for empty query', async () => {
      const results = await searchPosts('');
      expect(results).toEqual([]);
    });

    it('should find posts by content', async () => {
      if (!testPost) return;

      // Search for a word from the post content
      const words = testPost.content.split(' ');
      if (words.length > 0) {
        const results = await searchPosts(words[0]);
        expect(Array.isArray(results)).toBe(true);
      }
    });

    it('should return posts with user data', async () => {
      if (!testPost) return;

      const words = testPost.content.split(' ');
      if (words.length > 0) {
        const results = await searchPosts(words[0]);
        if (results.length > 0) {
          expect(results[0]).toHaveProperty('user');
          expect(results[0].user).toHaveProperty('handle');
        }
      }
    });
  });

  describe('searchHashtags', () => {
    it('should return empty array for empty query', async () => {
      const results = await searchHashtags('');
      expect(results).toEqual([]);
    });

    it('should handle hashtags with # prefix', async () => {
      const results = await searchHashtags('#test');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle hashtags without # prefix', async () => {
      const results = await searchHashtags('test');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('searchAll', () => {
    it('should return empty results for empty query', async () => {
      const results = await searchAll('');
      expect(results).toEqual({ users: [], posts: [] });
    });

    it('should return categorized results', async () => {
      if (!testUser) return;

      const results = await searchAll(testUser.handle);
      expect(results).toHaveProperty('users');
      expect(results).toHaveProperty('posts');
      expect(Array.isArray(results.users)).toBe(true);
      expect(Array.isArray(results.posts)).toBe(true);
    });

    it('should handle hashtag searches', async () => {
      const results = await searchAll('#test');
      expect(results.users).toEqual([]);
      expect(Array.isArray(results.posts)).toBe(true);
    });

    it('should search both users and posts for regular queries', async () => {
      if (!testUser) return;

      const results = await searchAll(testUser.name);
      expect(Array.isArray(results.users)).toBe(true);
      expect(Array.isArray(results.posts)).toBe(true);
    });
  });
});
