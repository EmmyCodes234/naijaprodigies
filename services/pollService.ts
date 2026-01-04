import { supabase } from './supabaseClient';

export interface PollOption {
    id: string;
    text: string;
    order: number;
    votes: number;
}

export interface Poll {
    id: string;
    question: string;
    expires_at: string;
    created_at: string;
    options: PollOption[];
    user_vote?: string; // Option ID the current user voted for
    total_votes: number;
}

export const createPoll = async (
    question: string,
    options: string[],
    expiresAt: Date,
    userId: string
): Promise<string> => {
    // 1. Create Poll
    const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .insert({
            question,
            expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

    if (pollError) throw pollError;

    // 2. Create Options
    const optionsData = options.map((text, index) => ({
        poll_id: pollData.id,
        text,
        display_order: index
    }));

    const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsData);

    if (optionsError) throw optionsError;

    return pollData.id;
};

export const votePoll = async (
    pollId: string,
    optionId: string,
    userId: string
): Promise<void> => {
    const { error } = await supabase
        .from('poll_votes')
        .insert({
            poll_id: pollId,
            option_id: optionId,
            user_id: userId
        });

    if (error) {
        if (error.code === '23505') { // Unique violation
            throw new Error('You have already voted in this poll');
        }
        throw error;
    }
};

export const getPoll = async (pollId: string, userId?: string): Promise<Poll | null> => {
    // Fetch poll details
    const { data: poll, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('id', pollId)
        .single();

    if (pollError || !poll) return null;

    // Fetch options and vote counts
    const { data: options, error: optionsError } = await supabase
        .from('poll_options')
        .select('id, text, display_order')
        .eq('poll_id', pollId)
        .order('display_order');

    if (optionsError) return null;

    // Get vote counts for each option
    // Note: For a real scalable app, we'd use a counter cache or a view.
    // For now, raw count is okay for MVP.
    const { data: votes, error: votesError } = await supabase
        .from('poll_votes')
        .select('option_id');

    if (votesError) return null;

    // Check user's vote
    let userVote = undefined;
    if (userId) {
        const { data: myVote } = await supabase
            .from('poll_votes')
            .select('option_id')
            .eq('poll_id', pollId)
            .eq('user_id', userId)
            .single();
        if (myVote) userVote = myVote.option_id;
    }

    const optionsWithCounts = options.map(opt => ({
        ...opt,
        votes: votes.filter((v: any) => v.option_id === opt.id).length,
        order: opt.display_order
    }));

    return {
        ...poll,
        options: optionsWithCounts,
        user_vote: userVote,
        total_votes: votes.length
    };
};
