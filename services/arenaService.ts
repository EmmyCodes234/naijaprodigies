// ============================================
// NSP Arena - Tournament Service
// Core service for Arena tournament operations
// ============================================

import { supabase } from './supabaseClient';

// ============================================
// TYPES
// ============================================

export type PairingSystem =
    | 'swiss'
    | 'round_robin'
    | 'initial_fontes'
    | 'king_of_the_hill'
    | 'team_round_robin'
    | 'manual';

export type TournamentStatus = 'draft' | 'registration' | 'active' | 'completed' | 'cancelled';
export type RoundStatus = 'pending' | 'active' | 'completed';
export type GameStatus = 'pending' | 'live' | 'completed' | 'forfeit' | 'bye';

export interface ArenaTournament {
    id: string;
    name: string;
    description: string | null;
    director_id: string;
    start_date: string | null;
    end_date: string | null;
    registration_deadline: string | null;
    status: TournamentStatus;
    is_public: boolean;
    max_players: number | null;
    platform: 'woogles' | 'live' | 'other';
    created_at: string;
    updated_at: string;
}

export interface ArenaDivision {
    id: string;
    tournament_id: string;
    name: string;
    description: string | null;
    sort_order: number;
    lexicon: string;
    time_control_initial: number;
    time_control_increment: number;
    challenge_rule: string;
    min_rating: number | null;
    max_rating: number | null;
    total_rounds: number;
    current_round: number;
    max_repeats: number;
    created_at: string;
    updated_at: string;
}

export interface ArenaParticipant {
    id: string;
    division_id: string;
    user_id: string;
    display_name: string;
    woogles_username: string | null;
    rating: number | null;
    wins: number;
    losses: number;
    spread: number;
    opponent_wins: number;
    is_active: boolean;
    checked_in: boolean;
    checked_in_at: string | null;
    seed: number | null;
    joined_round: number;
    created_at: string;
    updated_at: string;
}

export interface ArenaRound {
    id: string;
    division_id: string;
    round_number: number;
    pairing_system: PairingSystem;
    status: RoundStatus;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
}

export interface ArenaPairing {
    id: string;
    round_id: string;
    player1_id: string | null;
    player2_id: string | null;
    table_number: number | null;
    is_bye: boolean;
    created_at: string;
}

export interface ArenaGame {
    id: string;
    pairing_id: string;
    score1: number | null;
    score2: number | null;
    winner_id: string | null;
    spread: number | null;
    status: GameStatus;
    woogles_game_id: string | null;
    woogles_game_url: string | null;
    forfeit_player_id: string | null;
    is_double_forfeit: boolean;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface TournamentChat {
    id: string;
    tournament_id: string;
    user_id: string;
    message: string;
    message_type: 'text' | 'announcement' | 'system';
    is_director_message: boolean;
    created_at: string;
}

// ============================================
// TOURNAMENT CRUD
// ============================================

export const createTournament = async (data: Partial<ArenaTournament>) => {
    const { data: tournament, error } = await supabase
        .from('arena_tournaments')
        .insert([data])
        .select()
        .single();

    if (error) throw error;
    return tournament as ArenaTournament;
};

export const getTournament = async (id: string) => {
    const { data, error } = await supabase
        .from('arena_tournaments')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as ArenaTournament;
};

export const getMyTournaments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('arena_tournaments')
        .select('*')
        .eq('director_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ArenaTournament[];
};

export const getPublicTournaments = async () => {
    const { data, error } = await supabase
        .from('arena_tournaments')
        .select('*')
        .eq('is_public', true)
        .in('status', ['registration', 'active'])
        .order('start_date', { ascending: true });

    if (error) throw error;
    return data as ArenaTournament[];
};

export const updateTournament = async (id: string, updates: Partial<ArenaTournament>) => {
    const { data, error } = await supabase
        .from('arena_tournaments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as ArenaTournament;
};

// ============================================
// DIVISION CRUD
// ============================================

export const createDivision = async (tournamentId: string, data: Partial<ArenaDivision>) => {
    const { data: division, error } = await supabase
        .from('arena_divisions')
        .insert([{ tournament_id: tournamentId, ...data }])
        .select()
        .single();

    if (error) throw error;
    return division as ArenaDivision;
};

export const getDivisions = async (tournamentId: string) => {
    const { data, error } = await supabase
        .from('arena_divisions')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('sort_order', { ascending: true });

    if (error) throw error;
    return data as ArenaDivision[];
};

export const getDivision = async (id: string) => {
    const { data, error } = await supabase
        .from('arena_divisions')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as ArenaDivision;
};

export const updateDivision = async (id: string, updates: Partial<ArenaDivision>) => {
    const { data, error } = await supabase
        .from('arena_divisions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as ArenaDivision;
};

// ============================================
// PARTICIPANT CRUD
// ============================================

export const registerParticipant = async (
    divisionId: string,
    userId: string,
    displayName: string,
    wooglesUsername?: string
) => {
    const { data, error } = await supabase
        .from('arena_participants')
        .insert([{
            division_id: divisionId,
            user_id: userId,
            display_name: displayName,
            woogles_username: wooglesUsername || null
        }])
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            throw new Error('Already registered for this division');
        }
        throw error;
    }
    return data as ArenaParticipant;
};

export const getParticipants = async (divisionId: string) => {
    const { data, error } = await supabase
        .from('arena_participants')
        .select('*')
        .eq('division_id', divisionId)
        .eq('is_active', true)
        .order('wins', { ascending: false })
        .order('spread', { ascending: false });

    if (error) throw error;
    return data as ArenaParticipant[];
};

export const checkInParticipant = async (divisionId: string, userId: string) => {
    const { data, error } = await supabase
        .from('arena_participants')
        .update({
            checked_in: true,
            checked_in_at: new Date().toISOString()
        })
        .eq('division_id', divisionId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) throw error;
    return data as ArenaParticipant;
};

export const withdrawParticipant = async (participantId: string) => {
    const { error } = await supabase
        .from('arena_participants')
        .update({ is_active: false })
        .eq('id', participantId);

    if (error) throw error;
};

export const updateParticipantStats = async (
    participantId: string,
    wins: number,
    losses: number,
    spread: number
) => {
    const { error } = await supabase
        .from('arena_participants')
        .update({ wins, losses, spread })
        .eq('id', participantId);

    if (error) throw error;
};

// ============================================
// ROUND CRUD
// ============================================

export const createRound = async (
    divisionId: string,
    roundNumber: number,
    pairingSystem: PairingSystem = 'swiss'
) => {
    const { data, error } = await supabase
        .from('arena_rounds')
        .insert([{
            division_id: divisionId,
            round_number: roundNumber,
            pairing_system: pairingSystem
        }])
        .select()
        .single();

    if (error) throw error;
    return data as ArenaRound;
};

export const getRounds = async (divisionId: string) => {
    const { data, error } = await supabase
        .from('arena_rounds')
        .select('*')
        .eq('division_id', divisionId)
        .order('round_number', { ascending: true });

    if (error) throw error;
    return data as ArenaRound[];
};

export const startRound = async (roundId: string) => {
    const { data, error } = await supabase
        .from('arena_rounds')
        .update({
            status: 'active',
            started_at: new Date().toISOString()
        })
        .eq('id', roundId)
        .select()
        .single();

    if (error) throw error;
    return data as ArenaRound;
};

export const completeRound = async (roundId: string) => {
    const { data, error } = await supabase
        .from('arena_rounds')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString()
        })
        .eq('id', roundId)
        .select()
        .single();

    if (error) throw error;
    return data as ArenaRound;
};

// ============================================
// PAIRING & GAME CRUD
// ============================================

export const createPairing = async (
    roundId: string,
    player1Id: string | null,
    player2Id: string | null,
    tableNumber?: number,
    isBye: boolean = false
) => {
    const { data, error } = await supabase
        .from('arena_pairings')
        .insert([{
            round_id: roundId,
            player1_id: player1Id,
            player2_id: player2Id,
            table_number: tableNumber,
            is_bye: isBye
        }])
        .select()
        .single();

    if (error) throw error;

    // Also create the game record
    const { data: game, error: gameError } = await supabase
        .from('arena_games')
        .insert([{
            pairing_id: data.id,
            status: isBye ? 'bye' : 'pending'
        }])
        .select()
        .single();

    if (gameError) throw gameError;

    return { pairing: data as ArenaPairing, game: game as ArenaGame };
};

export const getPairings = async (roundId: string) => {
    const { data, error } = await supabase
        .from('arena_pairings')
        .select(`
            *,
            player1:player1_id(id, display_name, woogles_username),
            player2:player2_id(id, display_name, woogles_username),
            game:arena_games(*)
        `)
        .eq('round_id', roundId)
        .order('table_number', { ascending: true });

    if (error) throw error;
    return data;
};

export const setGameResult = async (
    gameId: string,
    score1: number,
    score2: number,
    winnerId: string | null
) => {
    const spread = score1 - score2;

    const { data, error } = await supabase
        .from('arena_games')
        .update({
            score1,
            score2,
            winner_id: winnerId,
            spread,
            status: 'completed',
            completed_at: new Date().toISOString()
        })
        .eq('id', gameId)
        .select()
        .single();

    if (error) throw error;
    return data as ArenaGame;
};

export const setGameForfeit = async (
    gameId: string,
    forfeitPlayerId: string | null,
    isDoubleForfeit: boolean = false
) => {
    const { data, error } = await supabase
        .from('arena_games')
        .update({
            forfeit_player_id: forfeitPlayerId,
            is_double_forfeit: isDoubleForfeit,
            status: 'forfeit',
            completed_at: new Date().toISOString()
        })
        .eq('id', gameId)
        .select()
        .single();

    if (error) throw error;
    return data as ArenaGame;
};

// ============================================
// CHAT OPERATIONS
// ============================================

export const sendChatMessage = async (
    tournamentId: string,
    message: string,
    isDirector: boolean = false,
    messageType: 'text' | 'announcement' | 'system' = 'text'
) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('tournament_chat')
        .insert([{
            tournament_id: tournamentId,
            user_id: user.id,
            message,
            message_type: messageType,
            is_director_message: isDirector
        }])
        .select()
        .single();

    if (error) throw error;
    return data as TournamentChat;
};

export const getChatMessages = async (tournamentId: string, limit: number = 100) => {
    const { data, error } = await supabase
        .from('tournament_chat')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: true })
        .limit(limit);

    if (error) throw error;
    return data as TournamentChat[];
};

export const subscribeToChatMessages = (
    tournamentId: string,
    onMessage: (message: TournamentChat) => void
) => {
    const channel = supabase
        .channel(`chat-${tournamentId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'tournament_chat',
                filter: `tournament_id=eq.${tournamentId}`
            },
            (payload) => onMessage(payload.new as TournamentChat)
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
};

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

export const subscribeToStandings = (
    divisionId: string,
    onUpdate: (participants: ArenaParticipant[]) => void
) => {
    const channel = supabase
        .channel(`standings-${divisionId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'arena_participants',
                filter: `division_id=eq.${divisionId}`
            },
            async () => {
                const participants = await getParticipants(divisionId);
                onUpdate(participants);
            }
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
};

export const subscribeToGames = (
    roundId: string,
    onUpdate: (pairings: any[]) => void
) => {
    const channel = supabase
        .channel(`games-${roundId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'arena_games'
            },
            async () => {
                const pairings = await getPairings(roundId);
                onUpdate(pairings);
            }
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
};
