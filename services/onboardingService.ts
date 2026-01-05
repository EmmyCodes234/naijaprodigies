import { supabase } from './supabaseClient';

/**
 * Onboarding Service
 * Handles all onboarding-related operations
 */

export interface InterestTopic {
    id: string;
    name: string;
    slug: string;
    icon: string;
    color: string;
}

/**
 * Get all available interest topics
 */
export const getInterestTopics = async (): Promise<InterestTopic[]> => {
    const { data, error } = await supabase
        .from('interest_topics')
        .select('*')
        .order('name');

    if (error) throw error;
    return data || [];
};

/**
 * Save user's selected interests
 */
export const saveUserInterests = async (userId: string, topicIds: string[]): Promise<void> => {
    // First, delete existing interests
    const { error: deleteError } = await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', userId);

    if (deleteError) throw deleteError;

    // Then insert new ones
    if (topicIds.length > 0) {
        const interests = topicIds.map(topicId => ({
            user_id: userId,
            topic_id: topicId
        }));

        const { error: insertError } = await supabase
            .from('user_interests')
            .insert(interests);

        if (insertError) throw insertError;
    }
};

/**
 * Get user's current interests
 */
export const getUserInterests = async (userId: string): Promise<string[]> => {
    const { data, error } = await supabase
        .from('user_interests')
        .select('topic_id')
        .eq('user_id', userId);

    if (error) throw error;
    return (data || []).map(item => item.topic_id);
};

/**
 * Get suggested users to follow based on interests
 * Returns verified users and active players
 */
export const getSuggestedFollows = async (
    userId: string,
    limit: number = 10
): Promise<any[]> => {
    // Get users who are verified or have high activity
    // Exclude the current user and users already followed
    const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

    const followingIds = (following || []).map(f => f.following_id);
    followingIds.push(userId); // Exclude self

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .or('verified.eq.true,verification_type.neq.none')
        .not('id', 'in', `(${followingIds.join(',')})`)
        .limit(limit);

    if (error) throw error;
    return data || [];
};

/**
 * Mark onboarding as completed
 */
export const completeOnboarding = async (userId: string): Promise<void> => {
    const { error } = await supabase
        .from('users')
        .update({ onboarding_completed: true })
        .eq('id', userId);

    if (error) throw error;
};

/**
 * Check if user has completed onboarding
 */
export const hasCompletedOnboarding = async (userId: string): Promise<boolean> => {
    const { data, error } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', userId)
        .single();

    if (error) return true; // Default to true if error (don't block user)
    return data?.onboarding_completed ?? false;
};

/**
 * Update user profile during onboarding
 */
export const updateOnboardingProfile = async (
    userId: string,
    updates: { name?: string; bio?: string; avatar?: string }
): Promise<void> => {
    const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

    if (error) throw error;
};
