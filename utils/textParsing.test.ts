import { describe, it, expect } from 'vitest';
import { extractHashtags, extractMentions, parseContentParts } from './textParsing';

describe('textParsing utilities', () => {
  describe('extractHashtags', () => {
    it('should extract hashtags from content', () => {
      const content = 'Check out #NSP_Tournament and #Scrabble!';
      const hashtags = extractHashtags(content);
      expect(hashtags).toEqual(['NSP_Tournament', 'Scrabble']);
    });

    it('should handle content with no hashtags', () => {
      const content = 'Just a regular post';
      const hashtags = extractHashtags(content);
      expect(hashtags).toEqual([]);
    });

    it('should handle empty content', () => {
      const hashtags = extractHashtags('');
      expect(hashtags).toEqual([]);
    });

    it('should extract hashtags at the start of content', () => {
      const content = '#FirstTag is at the beginning';
      const hashtags = extractHashtags(content);
      expect(hashtags).toEqual(['FirstTag']);
    });
  });

  describe('extractMentions', () => {
    it('should extract mentions from content', () => {
      const content = 'Hey @john_doe and @jane_smith, check this out!';
      const mentions = extractMentions(content);
      expect(mentions).toEqual(['john_doe', 'jane_smith']);
    });

    it('should handle content with no mentions', () => {
      const content = 'Just a regular post';
      const mentions = extractMentions(content);
      expect(mentions).toEqual([]);
    });

    it('should handle empty content', () => {
      const mentions = extractMentions('');
      expect(mentions).toEqual([]);
    });

    it('should extract mentions at the start of content', () => {
      const content = '@firstUser is mentioned first';
      const mentions = extractMentions(content);
      expect(mentions).toEqual(['firstUser']);
    });
  });

  describe('parseContentParts', () => {
    it('should parse content with hashtags and mentions', () => {
      const content = 'Hello @user check #tag';
      const parts = parseContentParts(content);
      
      // Should have: 'Hello', ' ', '@user', ' check', ' ', '#tag'
      expect(parts.length).toBeGreaterThan(0);
      
      // Check that mention is parsed correctly
      const mentionPart = parts.find(p => p.type === 'mention');
      expect(mentionPart).toBeDefined();
      expect(mentionPart?.content).toBe('@user');
      expect(mentionPart?.target).toBe('user');
      
      // Check that hashtag is parsed correctly
      const hashtagPart = parts.find(p => p.type === 'hashtag');
      expect(hashtagPart).toBeDefined();
      expect(hashtagPart?.content).toBe('#tag');
      expect(hashtagPart?.target).toBe('tag');
    });

    it('should handle plain text', () => {
      const content = 'Just plain text';
      const parts = parseContentParts(content);
      
      expect(parts).toHaveLength(1);
      expect(parts[0]).toEqual({ type: 'text', content: 'Just plain text' });
    });

    it('should handle empty content', () => {
      const parts = parseContentParts('');
      expect(parts).toHaveLength(1);
      expect(parts[0]).toEqual({ type: 'text', content: '' });
    });

    it('should parse hashtags correctly', () => {
      const content = 'Check #NSP_Tournament';
      const parts = parseContentParts(content);
      
      const hashtagPart = parts.find(p => p.type === 'hashtag');
      expect(hashtagPart).toBeDefined();
      expect(hashtagPart?.content).toBe('#NSP_Tournament');
      expect(hashtagPart?.target).toBe('NSP_Tournament');
    });

    it('should parse mentions correctly', () => {
      const content = 'Hey @john_doe';
      const parts = parseContentParts(content);
      
      const mentionPart = parts.find(p => p.type === 'mention');
      expect(mentionPart).toBeDefined();
      expect(mentionPart?.content).toBe('@john_doe');
      expect(mentionPart?.target).toBe('john_doe');
    });
  });
});
