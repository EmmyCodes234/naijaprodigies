import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS Headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Keys (Ideally set these in Supabase Dashboard -> Settings -> Edge Functions)
// Fallbacks provided for immediate dev testing based on user context
const CEREBRAS_KEY = Deno.env.get('CEREBRAS_API_KEY') || 'csk-fptmf5m4hxn84c3jx95yw9tce2v6yxkhpjkwjpkxd88cmrjp';
const TAVILY_KEY = Deno.env.get('TAVILY_API_KEY') || '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';

// Rate Limit Config
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_MAX_REQUESTS = 20;

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { prompt, postContent } = await req.json();

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
        const SYSTEM_PROMPT = `You are Prodigy AI, a witty, intelligent assistant for NSP.
        IMPORTANT: Your knowledge cutoff is outdated.
        If user asks about RECENT events (today/this week), reply ONLY with: SEARCH: <query>
        Otherwise, reply directly. Concise & playful.`;

        const initialMessages = [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Current Date: ${new Date().toDateString()}\nContext: "${postContent}"\n\nUser Request: ${prompt}` }
        ];

        // First Call
        let response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CEREBRAS_KEY}` },
            body: JSON.stringify({
                model: "llama-3.3-70b",
                messages: initialMessages,
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
                ...initialMessages,
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
