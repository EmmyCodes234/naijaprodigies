// SECURE IMPLEMENTATION: Keys are now in Edge Function 'prodigy-brain'

interface AIResponse {
    content: string;
    isError: boolean;
}

export const analyzePost = async (postContent: string, prompt: string): Promise<AIResponse> => {
    try {
        const { supabase } = await import('./supabaseClient');

        const { data, error } = await supabase.functions.invoke('prodigy-brain', {
            body: {
                postContent,
                prompt
            }
        });

        if (error) {
            console.error('Edge Function Error:', error);

            // Handle Rate Limit specifically
            if (error && (error.status === 429 || error.context?.response?.status === 429)) {
                return {
                    content: "🚫 Brain Overload! You've used all your credits for this hour. Please try again later.",
                    isError: true
                };
            }

            throw error;
        }

        return {
            content: data.content,
            isError: false
        };

    } catch (error) {
        console.error('AI Service Failed:', error);
        return {
            content: "Sorry, I'm having trouble connecting to my brain right now.",
            isError: true
        }
    }
};


export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export const chatWithProdigy = async (messages: ChatMessage[]): Promise<AIResponse> => {
    try {
        const { supabase } = await import('./supabaseClient');

        const { data, error } = await supabase.functions.invoke('prodigy-brain', {
            body: {
                messages,
                // Context for other use cases can remain if needed, but for chat, messages is primary
                postContent: "User is chatting directly with you.",
                prompt: messages[messages.length - 1].content
            }
        });

        if (error) {
            console.error('Edge Function Error:', error);
            if (error && (error.status === 429 || error.context?.response?.status === 429)) {
                return {
                    content: "🚫 Brain Overload! You've used all your credits for this hour. Please try again later.",
                    isError: true
                };
            }
            throw error;
        }

        return {
            content: data.content,
            isError: false
        };
    } catch (error) {
        console.error('AI Chat Failed:', error);
        return {
            content: "Sorry, I'm having trouble connecting to my brain right now.",
            isError: true
        }
    }
};

export const postAIComment = async (postId: string, content: string, parentCommentId?: string): Promise<string | null> => {
    try {
        const { supabase } = await import('./supabaseClient');

        const { data, error } = await supabase.rpc('create_ai_reply', {
            p_post_id: postId,
            p_content: content,
            p_parent_comment_id: parentCommentId || null
        });

        if (error) {
            console.error('create_ai_reply RPC error:', error);
            throw error;
        }
        return data;
    } catch (error) {
        console.error('Failed to post AI reply:', error);
        if (error && typeof error === 'object') {
            console.error('Error details:', JSON.stringify(error, null, 2));
        }
        return null;
    }
};
