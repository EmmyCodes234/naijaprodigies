/**
 * Utility functions for parsing hashtags and mentions in post content
 */

/**
 * Extracts all hashtags from post content
 * Hashtags start with # and can contain letters, numbers, and underscores
 * @param content - The post content to parse
 * @returns Array of hashtags (without the # symbol)
 */
export function extractHashtags(content: string): string[] {
  if (!content) return [];
  
  // Match hashtags: # followed by alphanumeric characters and underscores
  // Must not be preceded by alphanumeric character (to avoid matching mid-word)
  const hashtagRegex = /(?:^|\s)#([a-zA-Z0-9_]+)/g;
  const matches = content.matchAll(hashtagRegex);
  
  const hashtags: string[] = [];
  for (const match of matches) {
    if (match[1]) {
      hashtags.push(match[1]);
    }
  }
  
  return hashtags;
}

/**
 * Extracts all mentions from post content
 * Mentions start with @ and can contain letters, numbers, and underscores
 * @param content - The post content to parse
 * @returns Array of mentioned usernames (without the @ symbol)
 */
export function extractMentions(content: string): string[] {
  if (!content) return [];
  
  // Match mentions: @ followed by alphanumeric characters and underscores
  // Must not be preceded by alphanumeric character (to avoid matching mid-word)
  const mentionRegex = /(?:^|\s)@([a-zA-Z0-9_]+)/g;
  const matches = content.matchAll(mentionRegex);
  
  const mentions: string[] = [];
  for (const match of matches) {
    if (match[1]) {
      mentions.push(match[1]);
    }
  }
  
  return mentions;
}

export interface ContentPart {
  type: 'text' | 'hashtag' | 'mention';
  content: string;
  target?: string; // For hashtags and mentions, the actual tag/username without # or @
}

/**
 * Parses post content into parts for rendering
 * @param content - The post content to parse
 * @returns Array of content parts with type information
 */
export function parseContentParts(content: string): ContentPart[] {
  if (!content) return [{ type: 'text', content }];
  
  const parts: ContentPart[] = [];
  let lastIndex = 0;
  
  // Combined regex to match both hashtags and mentions
  const combinedRegex = /((?:^|\s)(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+))/g;
  
  let match;
  
  while ((match = combinedRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const tag = match[2]; // The actual #hashtag or @mention
    const matchStart = match.index;
    const matchEnd = matchStart + fullMatch.length;
    
    // Add text before the match
    if (matchStart > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, matchStart)
      });
    }
    
    // Add whitespace if present
    const leadingSpace = fullMatch.startsWith(' ') || fullMatch.startsWith('\n') || fullMatch.startsWith('\t');
    if (leadingSpace) {
      parts.push({
        type: 'text',
        content: fullMatch[0]
      });
    }
    
    // Determine if it's a hashtag or mention
    if (tag.startsWith('#')) {
      const hashtag = tag.substring(1);
      parts.push({
        type: 'hashtag',
        content: tag,
        target: hashtag
      });
    } else if (tag.startsWith('@')) {
      const username = tag.substring(1);
      parts.push({
        type: 'mention',
        content: tag,
        target: username
      });
    }
    
    lastIndex = matchEnd;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(lastIndex)
    });
  }
  
  return parts.length > 0 ? parts : [{ type: 'text', content }];
}
