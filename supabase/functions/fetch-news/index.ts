import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Tavily API Key - MUST be set in Supabase Dashboard -> Settings -> Edge Functions -> Secrets
const TAVILY_KEY = Deno.env.get('TAVILY_API_KEY');

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
    'https://nigeriascrabbleprodigies.com.ng',
    'http://localhost:3000',
    'http://localhost:5173',
];

const getCorsHeaders = (origin: string | null) => {
    const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
};

interface NewsRequest {
    topics?: string[];
    limit?: number;
}

interface NewsArticle {
    title: string;
    url: string;
    content?: string;
    publishedAt?: string;
    source?: string;
    imageUrl?: string;
}

serve(async (req) => {
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // Validate API Key
    if (!TAVILY_KEY) {
        return new Response(
            JSON.stringify({ error: 'News API not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        const { topics = ['Scrabble', 'word games', 'Nigeria'], limit = 5 }: NewsRequest = await req.json();

        // Build search query from topics - distinct logic per tab type
        // Check if topics imply a specific category like sports or entertainment
        const isSports = topics.includes('sports');
        const isEntertainment = topics.includes('entertainment');

        // Define exclusion terms - explicitly block betting
        const exclusions = '-betting -bet -odds -casino -gambling -prediction -booking -1xbet -bet9ja -sportybet';

        let query = '';
        if (isSports) {
            query = `latest sports news Nigeria football AFCON 2026 ${exclusions}`;
        } else if (isEntertainment) {
            query = `latest entertainment news Nigeria music movies celebrity 2026 ${exclusions}`;
        } else {
            // Default/News/Scrabble
            query = `latest ${topics.slice(0, 3).join(' ')} news today 2026 ${exclusions}`;
        }

        // Call Tavily Search API with advanced search for better results
        const tavilyResponse = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: TAVILY_KEY,
                query: query,
                search_depth: 'advanced', // Deep search for better, more recent results
                topic: 'news', // Focus on news content
                days: 7, // Only content from last 7 days
                include_images: true,
                include_answer: false,
                max_results: limit * 2, // Fetch more to filter
            }),
        });

        if (!tavilyResponse.ok) {
            throw new Error(`Tavily API error: ${tavilyResponse.status}`);
        }

        const tavilyData = await tavilyResponse.json();

        // Transform results to our format
        let articles: NewsArticle[] = (tavilyData.results || []).map((result: any) => ({
            title: result.title,
            url: result.url,
            content: result.content?.substring(0, 200) + '...',
            source: new URL(result.url).hostname.replace('www.', ''),
            imageUrl: tavilyData.images?.[0] || null,
            publishedAt: new Date().toISOString(), // Tavily doesn't provide dates, use current
        }));

        // Post-processing: Strictly filter out betting content from results
        // This is a safety net in case the API search query 'exclusions' didn't catch everything
        const bettingKeywords = ['bet', 'betting', 'odds', 'casino', 'gambling', 'prediction', 'booking', '1xbet', 'bet9ja', 'sportybet', 'wins', 'jackpot', 'poker'];

        articles = articles.filter(article => {
            const text = (article.title + ' ' + (article.content || '')).toLowerCase();
            // Check if any betting keyword exists as a distinct word
            return !bettingKeywords.some(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                return regex.test(text);
            });
        });

        return new Response(
            JSON.stringify({ articles }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('News fetch error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to fetch news', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
