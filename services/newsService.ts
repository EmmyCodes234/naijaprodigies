import { supabase } from './supabaseClient';

export interface NewsArticle {
    title: string;
    url: string;
    content?: string;
    publishedAt?: string;
    source?: string;
    imageUrl?: string;
}

// Cache for news to avoid too many API calls
// Reduced cache duration for better freshness, and separating cache by topic key
const newsCache = new Map<string, { data: NewsArticle[], timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

/**
 * Fetch news articles based on topics
 */
export const fetchNews = async (topics?: string[], limit: number = 5, forceRefresh: boolean = false): Promise<NewsArticle[]> => {
    const cacheKey = (topics || []).sort().join('-');
    const now = Date.now();
    const cached = newsCache.get(cacheKey);

    // Return cached news if still valid and not forcing refresh
    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_DURATION) {
        return cached.data;
    }

    try {
        const { data, error } = await supabase.functions.invoke('fetch-news', {
            body: { topics, limit }
        });

        if (error) throw error;

        const articles = data.articles || [];
        newsCache.set(cacheKey, { data: articles, timestamp: now });

        return articles;
    } catch (error) {
        console.error('Failed to fetch news:', error);
        // Return cached news even if expired, as fallback
        return cached?.data || [];
    }
};

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
        return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
};
