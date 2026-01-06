export interface NewsArticle {
    title: string;
    url: string;
    content?: string;
    publishedAt?: string;
    source?: string;
    imageUrl?: string;
    category?: 'general' | 'sports' | 'entertainment' | 'business' | 'technology';
}

// Cache for news to avoid too many API calls
const newsCache = new Map<string, { data: NewsArticle[], timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

// Location cache
let userLocation: { countryCode: string; countryName: string } | null = null;

// Country code to Google News locale mapping
const COUNTRY_LOCALES: Record<string, { hl: string; gl: string; ceid: string }> = {
    NG: { hl: 'en-NG', gl: 'NG', ceid: 'NG:en' },      // Nigeria
    US: { hl: 'en-US', gl: 'US', ceid: 'US:en' },      // United States
    GB: { hl: 'en-GB', gl: 'GB', ceid: 'GB:en' },      // United Kingdom
    CA: { hl: 'en-CA', gl: 'CA', ceid: 'CA:en' },      // Canada
    AU: { hl: 'en-AU', gl: 'AU', ceid: 'AU:en' },      // Australia
    IN: { hl: 'en-IN', gl: 'IN', ceid: 'IN:en' },      // India
    ZA: { hl: 'en-ZA', gl: 'ZA', ceid: 'ZA:en' },      // South Africa
    KE: { hl: 'en-KE', gl: 'KE', ceid: 'KE:en' },      // Kenya
    GH: { hl: 'en-GH', gl: 'GH', ceid: 'GH:en' },      // Ghana
    DE: { hl: 'de', gl: 'DE', ceid: 'DE:de' },         // Germany
    FR: { hl: 'fr', gl: 'FR', ceid: 'FR:fr' },         // France
};

// Google News topic IDs (these are consistent across locales)
const TOPIC_IDS = {
    general: '', // Top stories, no topic ID needed
    sports: 'CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtVnVHZ0pWVXlnQVAB',
    entertainment: 'CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtVnVHZ0pWVXlnQVAB',
    business: 'CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB',
    technology: 'CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB',
};

/**
 * Detect user's location via IP-based geolocation (free service)
 */
export const detectUserLocation = async (): Promise<{ countryCode: string; countryName: string }> => {
    // Return cached location if available
    if (userLocation) return userLocation;

    try {
        // Using free IP geolocation API
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error('Geolocation failed');

        const data = await response.json();
        userLocation = {
            countryCode: data.country_code || 'US',
            countryName: data.country_name || 'United States'
        };
        return userLocation;
    } catch (error) {
        console.warn('Failed to detect location, defaulting to US:', error);
        userLocation = { countryCode: 'US', countryName: 'United States' };
        return userLocation;
    }
};

/**
 * Build RSS feed URL based on country and category
 */
const buildFeedUrl = (countryCode: string, category: keyof typeof TOPIC_IDS): string => {
    const locale = COUNTRY_LOCALES[countryCode] || COUNTRY_LOCALES['US'];
    const topicId = TOPIC_IDS[category] || TOPIC_IDS['general'];

    if (category === 'general' || !topicId) {
        // Top stories for the country
        return `https://news.google.com/rss?hl=${locale.hl}&gl=${locale.gl}&ceid=${locale.ceid}`;
    } else {
        // Specific topic for the country
        return `https://news.google.com/rss/topics/${topicId}?hl=${locale.hl}&gl=${locale.gl}&ceid=${locale.ceid}`;
    }
};

/**
 * Parse RSS XML to extract news articles
 */
const parseRSSFeed = (xml: string, category: keyof typeof TOPIC_IDS): NewsArticle[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const items = doc.querySelectorAll('item');

    const articles: NewsArticle[] = [];
    items.forEach((item) => {
        const title = item.querySelector('title')?.textContent || '';
        const link = item.querySelector('link')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';
        const source = item.querySelector('source')?.textContent || 'Google News';
        const description = item.querySelector('description')?.textContent || '';

        // Extract image from description if available
        let imageUrl: string | undefined;
        const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch) {
            imageUrl = imgMatch[1];
        }

        articles.push({
            title: title.replace(/ - .*$/, ''), // Clean title (remove source suffix)
            url: link,
            publishedAt: pubDate,
            source,
            imageUrl,
            content: description.replace(/<[^>]*>/g, '').substring(0, 200), // Strip HTML
            category
        });
    });

    return articles;
};

/**
 * Fetch news articles from RSS feeds (FREE, location-aware!)
 * @param category - News category: 'general', 'sports', 'entertainment', 'business', 'technology'
 * @param limit - Maximum number of articles to return
 * @param forceRefresh - Force bypass cache
 */
export const fetchNews = async (
    topics?: string[],
    limit: number = 5,
    forceRefresh: boolean = false
): Promise<NewsArticle[]> => {
    // Detect user location first
    const location = await detectUserLocation();
    const category = (topics?.[0]?.toLowerCase() || 'general') as keyof typeof TOPIC_IDS;
    const cacheKey = `${location.countryCode}-${category}`;
    const now = Date.now();
    const cached = newsCache.get(cacheKey);

    // Return cached news if still valid and not forcing refresh
    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_DURATION) {
        return cached.data.slice(0, limit);
    }

    try {
        const feedUrl = buildFeedUrl(location.countryCode, category);

        // Use a CORS proxy for client-side RSS fetching
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Failed to fetch RSS feed');

        const xml = await response.text();
        const articles = parseRSSFeed(xml, category);

        newsCache.set(cacheKey, { data: articles, timestamp: now });
        return articles.slice(0, limit);
    } catch (error) {
        console.error('Failed to fetch news:', error);
        // Return cached news even if expired, as fallback
        return cached?.data.slice(0, limit) || [];
    }
};

/**
 * Fetch news for multiple categories at once
 */
export const fetchNewsByCategories = async (
    categories: Array<'general' | 'sports' | 'entertainment' | 'business' | 'technology'> = ['general'],
    limitPerCategory: number = 5
): Promise<Record<string, NewsArticle[]>> => {
    const results: Record<string, NewsArticle[]> = {};

    await Promise.all(
        categories.map(async (category) => {
            results[category] = await fetchNews([category], limitPerCategory);
        })
    );

    return results;
};

/**
 * Get user's current location info
 */
export const getUserLocation = (): { countryCode: string; countryName: string } | null => {
    return userLocation;
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
