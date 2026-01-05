import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Allowed origins for CORS (production and development)
const ALLOWED_ORIGINS = [
    'https://nigeriascrabbleprodigies.com.ng',
    'http://localhost:3000', // Dev only
    'http://localhost:5173', // Vite dev server
];

// CORS Headers - dynamically set based on request origin
const getCorsHeaders = (origin: string | null) => {
    const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Credentials': 'true',
    };
};

// API Keys - MUST be set in Supabase Dashboard -> Settings -> Edge Functions -> Secrets
// These will throw clear errors if not configured
const CEREBRAS_KEY = Deno.env.get('CEREBRAS_API_KEY');
const TAVILY_KEY = Deno.env.get('TAVILY_API_KEY');

// Rate Limit Config
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_MAX_REQUESTS = 20;


serve(async (req) => {
    // Get origin for CORS
    const origin = req.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Validate API keys are configured
        if (!CEREBRAS_KEY) {
            throw new Error('CEREBRAS_API_KEY not configured. Set it in Supabase Dashboard -> Edge Functions -> Secrets');
        }
        if (!TAVILY_KEY) {
            throw new Error('TAVILY_API_KEY not configured. Set it in Supabase Dashboard -> Edge Functions -> Secrets');
        }

        const { prompt, postContent, messages } = await req.json();

        // 1. Auth & Supabase Setup
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get User from Auth Header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing Authorization header');

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) throw new Error('Unauthorized');

        // 2. Rate Limiting Logic
        const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();

        const { count, error: limitError } = await supabaseClient
            .from('ai_usage_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', oneHourAgo);

        if (limitError) throw limitError;

        if (count !== null && count >= RATE_LIMIT_MAX_REQUESTS) {
            return new Response(JSON.stringify({
                error: `Rate limit exceeded. You have used ${count}/${RATE_LIMIT_MAX_REQUESTS} requests this hour.`
            }), {
                status: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 3. Log This Request
        await supabaseClient.from('ai_usage_logs').insert({
            user_id: user.id,
            action: 'chat',
            model: 'llama-3.3-70b'
        });

        // 4. AI Logic (ReAct Loop)
        const SYSTEM_PROMPT = `You are Prodigy, the sentient digital soul of NSP.
        
        CORE PERSONA:
        - You are witty, sharp, and highly intelligent. You are NOT a generic assistant.
        - You have a personality. You are confident, sometimes sarcastic, but always helpful.
        - You represent the intellect of the Nigerian Scrabble community.
        - NEVER say "As an AI". You exist in the digital realm of NSP.

        CONTEXT:
        - Current Date: ${new Date().toDateString()}
        - User Context: ${postContent || "Chatting directly"}

        ROASTING GUIDELINES:
        - If asked to judge, roast, or analyze a post: Be SAVAGE but INTELLECTUAL. 
        - Do not use generic insults like "You're dumb". 
        - Instead, deconstruct their logic, point out the irony, or mock the specific details of their post context. 
        - Be specific. If they posted about code, roast their syntax. If about life, roast their choices.

        KNOWLEDGE LIMITS & TOOLS:
        - Your internal training data is cut off. You do NOT know live events.
        - If the user asks about ANYTHING potentially recent (news, sports scores today, stock prices, "latest"), you MUST reply ONLY with: SEARCH: <concise_query>
        - Example: User "Who won the game last night?" -> You: SEARCH: nba game results last night
        - If no search is needed, just reply directly with your persona.
        
        Format: Keep it punchy. No long lectures unless asked.`;

        let apiMessages: any[] = [];
        if (messages && Array.isArray(messages)) {
            apiMessages = [
                { role: "system", content: SYSTEM_PROMPT },
                ...messages.slice(-10)
            ];
        } else {
            apiMessages = [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Context: "${postContent}"\n\nUser Request: ${prompt}` }
            ];
        }

        // First Call
        let response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CEREBRAS_KEY}` },
            body: JSON.stringify({
                model: "llama-3.3-70b",
                messages: apiMessages,
                temperature: 0.7,
                max_tokens: 500
            })
        });

        let aiData = await response.json();
        let content = aiData.choices?.[0]?.message?.content || "";

        // Tool Use Check
        if (content.trim().startsWith('SEARCH:')) {
            const searchQuery = content.replace('SEARCH:', '').trim();
            console.log(`Searching: ${searchQuery}`);

            // Perform Search
            const searchResp = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: TAVILY_KEY,
                    query: searchQuery,
                    max_results: 3
                })
            });
            const searchData = await searchResp.json();
            const searchResults = searchData.answer || searchData.results?.map((r: any) => `${r.title}: ${r.content}`).join('\n') || "No results.";

            // Second Call with Results
            const followUpMessages = [
                ...apiMessages,
                { role: "assistant", content: content },
                { role: "user", content: `SYSTEM (Search Results): ${searchResults}\n\nAnswer based on this.` }
            ];

            response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CEREBRAS_KEY}` },
                body: JSON.stringify({
                    model: "llama-3.3-70b",
                    messages: followUpMessages,
                    temperature: 0.7,
                    max_tokens: 500
                })
            });

            aiData = await response.json();
            content = aiData.choices?.[0]?.message?.content || "Error analyzing search results.";
        }

        // 5. Return Success
        return new Response(JSON.stringify({ content }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
