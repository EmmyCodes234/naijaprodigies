import React from 'react';
import { parseContentParts } from './textParsing';

/**
 * Renders post content with clickable hashtags and mentions
 * @param content - The post content to render
 * @returns JSX elements with links for hashtags and mentions
 */
export function renderContentWithLinks(content: string): React.ReactNode {
  const parts = parseContentParts(content);
  
  return parts.map((part, index) => {
    if (part.type === 'hashtag') {
      return (
        <a
          key={`hashtag-${index}`}
          href={`/search?q=${encodeURIComponent(part.content)}`}
          className="text-nsp-teal hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {part.content}
        </a>
      );
    } else if (part.type === 'mention') {
      return (
        <a
          key={`mention-${index}`}
          href={`/profile/${part.target}`}
          className="text-nsp-teal hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {part.content}
        </a>
      );
    } else {
      return <React.Fragment key={`text-${index}`}>{part.content}</React.Fragment>;
    }
  });
}
