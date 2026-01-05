import { supabase } from './supabaseClient';

export interface LiveGame {
    id: string;
    woogles_game_id: string;
    player1_name: string;
    player2_name: string;
    player1_rating: number | null;
    player2_rating: number | null;
    lexicon: string | null;
    time_control: string | null;
    game_url: string;
    status: 'active' | 'inactive' | 'ended';
    is_high_profile: boolean;
    created_at: string;
    last_seen_at: string;
    updated_at: string;
}

/**
 * Fetch all active live games
 */
export const getLiveGames = async (): Promise<LiveGame[]> => {
    const { data, error } = await supabase
        .from('live_games')
        .select('*')
        .eq('status', 'active')
        .order('is_high_profile', { ascending: false })
        .order('last_seen_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching live games:', error);
        return [];
    }

    return data || [];
};

// Keeping mock data definition for reference or future dev use
const MOCK_GAMES: LiveGame[] = [
    {
        id: 'mock-1',
        woogles_game_id: 'mock-1',
        player1_name: 'NigelRichards',
        player2_name: 'WellingtonJighere',
        player1_rating: 2200,
        player2_rating: 2150,
        lexicon: 'CSW24',
        time_control: '15/10',
        game_url: 'https://woogles.io/game/mock-1',
        status: 'active',
        is_high_profile: true,
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'mock-2',
        woogles_game_id: 'mock-2',
        player1_name: 'EmmyCodes',
        player2_name: 'ScrabbleBot',
        player1_rating: 1560,
        player2_rating: 1800,
        lexicon: 'NWL23',
        time_control: 'Blitz',
        game_url: 'https://woogles.io/game/mock-2',
        status: 'active',
        is_high_profile: false,
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'mock-3',
        woogles_game_id: 'mock-3',
        player1_name: 'ProdigyUser',
        player2_name: 'Guest123',
        player1_rating: 1200,
        player2_rating: null,
        lexicon: 'CSW24',
        time_control: '20/5',
        game_url: 'https://woogles.io/game/mock-3',
        status: 'active',
        is_high_profile: false,
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

/**
 * Fetch high-profile games only
 */
export const getHighProfileGames = async (): Promise<LiveGame[]> => {
    const { data, error } = await supabase
        .from('live_games')
        .select('*')
        .eq('status', 'active')
        .eq('is_high_profile', true)
        .order('last_seen_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching high-profile games:', error);
        throw error;
    }

    return data || [];
};

/**
 * Subscribe to real-time updates for live games
 */
export const subscribeToLiveGames = (
    onInsert: (game: LiveGame) => void,
    onUpdate: (game: LiveGame) => void,
    onDelete: (gameId: string) => void
) => {
    const channel = supabase
        .channel('live_games_changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'live_games',
                filter: 'status=eq.active'
            },
            (payload) => {
                onInsert(payload.new as LiveGame);
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'live_games'
            },
            (payload) => {
                const game = payload.new as LiveGame;
                if (game.status === 'active') {
                    onUpdate(game);
                } else {
                    onDelete(game.id);
                }
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'DELETE',
                schema: 'public',
                table: 'live_games'
            },
            (payload) => {
                onDelete((payload.old as any).id);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

/**
 * Subscribe specifically to high-profile game alerts
 */
export const subscribeToHighProfileAlerts = (
    onNewHighProfileGame: (game: LiveGame) => void
) => {
    const channel = supabase
        .channel('high_profile_alerts')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'live_games',
                filter: 'is_high_profile=eq.true'
            },
            (payload) => {
                onNewHighProfileGame(payload.new as LiveGame);
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'live_games',
                filter: 'is_high_profile=eq.true'
            },
            (payload) => {
                const game = payload.new as LiveGame;
                // Only alert if it just became high profile
                if (game.is_high_profile && !(payload.old as any)?.is_high_profile) {
                    onNewHighProfileGame(game);
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

/**
 * Get a formatted display string for player ratings
 */
export const formatRating = (rating: number | null): string => {
    if (!rating) return 'Unrated';
    return rating.toString();
};

/**
 * Get rating tier color class
 */
export const getRatingColor = (rating: number | null): string => {
    if (!rating) return 'text-gray-400';
    if (rating >= 2000) return 'text-pink-400'; // Expert
    if (rating >= 1800) return 'text-purple-400'; // Advanced
    if (rating >= 1600) return 'text-blue-400'; // Intermediate
    if (rating >= 1400) return 'text-green-400'; // Club
    return 'text-gray-400'; // Beginner
};

/**
 * Check if a game URL can be embedded (for future use)
 */
export const canEmbedGame = async (gameUrl: string): Promise<boolean> => {
    // Woogles.io typically doesn't allow iframe embedding
    // This is a placeholder for potential future workarounds
    return false;
};

/**
 * Open game in new tab with tracking
 */
export const openGameInNewTab = (game: LiveGame): void => {
    window.open(game.game_url, '_blank', 'noopener,noreferrer');
};
