
import { supabase } from './supabaseClient';
import { pairSwiss, pairRoundRobin, pairKOTH } from './pairingAlgorithms';
import { createBroadcastGame, getGameResult, WooglesGameConfig } from './wooglesApiService';


export type TournamentStatus = 'setup' | 'active' | 'completed';
export type PairingSystem = 'swiss' | 'round_robin' | 'koth';
export type MatchStatus = 'pending' | 'live' | 'finished';

export interface Tournament {
    id: string;
    name: string;
    description?: string;
    created_by: string;
    lexicon: string;
    round_count: number;
    pairing_system: PairingSystem;
    status: TournamentStatus;
    current_round: number;
}

export interface Participant {
    id: string;
    user_id: string;
    wins: number;
    spread: number;
    status: 'active' | 'withdrawn';
    // Helper fields for pairing logic
    opponentIds?: string[]; // cache of previous opponents
}

export interface Match {
    id: string;
    tournament_id: string;
    round_number: number;
    player1_id: string | null; // null for bye? or handle differently
    player2_id: string | null;
    score1?: number;
    score2?: number;
    status: MatchStatus;
    is_bye: boolean;
}

// --- Service Functions ---

export const createTournament = async (details: Partial<Tournament>) => {
    console.log('Creating tournament with:', details);

    const { data, error } = await supabase
        .from('tournaments')
        .insert([details])
        .select()
        .single();

    if (error) {
        console.error('Tournament creation error:', error);
        throw error;
    }
    return data;
};

export const registerParticipant = async (tournamentId: string, userId: string) => {
    const { data, error } = await supabase
        .from('tournament_participants')
        .insert([{ tournament_id: tournamentId, user_id: userId }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Self-registration with Woogles username
export const registerForTournament = async (
    tournamentId: string,
    userId: string,
    wooglesUsername: string
) => {
    // Check if registration is open
    const { data: tournament } = await supabase
        .from('tournaments')
        .select('registration_open, status')
        .eq('id', tournamentId)
        .single();

    if (!tournament?.registration_open || tournament.status !== 'setup') {
        throw new Error('Registration is closed for this tournament');
    }

    const { data, error } = await supabase
        .from('tournament_participants')
        .insert([{
            tournament_id: tournamentId,
            user_id: userId,
            woogles_username: wooglesUsername.trim(),
            wins: 0,
            losses: 0,
            spread: 0,
            status: 'active',
            checked_in: false,
            joined_round: 1
        }])
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            throw new Error('You are already registered for this tournament');
        }
        throw error;
    }
    return data;
};

// Player check-in
export const checkIn = async (tournamentId: string, userId: string) => {
    const { data: tournament } = await supabase
        .from('tournaments')
        .select('checkin_open')
        .eq('id', tournamentId)
        .single();

    if (!tournament?.checkin_open) {
        throw new Error('Check-in is not open yet');
    }

    const { data, error } = await supabase
        .from('tournament_participants')
        .update({
            checked_in: true,
            checked_in_at: new Date().toISOString()
        })
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Add late player with forfeit losses
export const addLatePlayer = async (
    tournamentId: string,
    userId: string,
    wooglesUsername: string,
    currentRound: number
) => {
    const missedRounds = currentRound - 1;
    const forfeitLosses = missedRounds;
    const forfeitSpread = missedRounds * -50;

    const { data, error } = await supabase
        .from('tournament_participants')
        .insert([{
            tournament_id: tournamentId,
            user_id: userId,
            woogles_username: wooglesUsername.trim(),
            wins: 0,
            losses: forfeitLosses,
            spread: forfeitSpread,
            status: 'active',
            checked_in: true,
            checked_in_at: new Date().toISOString(),
            joined_round: currentRound
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Toggle registration open/closed
export const toggleRegistration = async (tournamentId: string, isOpen: boolean) => {
    const { error } = await supabase
        .from('tournaments')
        .update({ registration_open: isOpen })
        .eq('id', tournamentId);
    if (error) throw error;
};

// Toggle check-in open/closed
export const toggleCheckin = async (tournamentId: string, isOpen: boolean) => {
    const { error } = await supabase
        .from('tournaments')
        .update({ checkin_open: isOpen })
        .eq('id', tournamentId);
    if (error) throw error;
};


// --- Pairing Logic ---

export const generatePairings = async (tournamentId: string, roundNumber: number, system: PairingSystem = 'swiss') => {
    // 1. Fetch only checked-in active participants
    const { data: participants, error: pError } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('status', 'active')
        .eq('checked_in', true);

    if (pError || !participants) throw pError || new Error('No participants');

    // 2. Fetch match history to avoid rematches (unless KOTH)
    const { data: matches, error: mError } = await supabase
        .from('tournament_matches')
        .select('player1_id, player2_id')
        .eq('tournament_id', tournamentId);

    if (mError) throw mError;

    // Build history map
    const history = new Map<string, Set<string>>();
    participants.forEach(p => history.set(p.user_id, new Set()));
    matches?.forEach(m => {
        if (m.player1_id && m.player2_id) {
            history.get(m.player1_id)?.add(m.player2_id);
            history.get(m.player2_id)?.add(m.player1_id);
        }
    });

    if (system === 'koth') {
        return pairKOTH(participants as Participant[]);
    } else if (system === 'round_robin') {
        return pairRoundRobin(participants as Participant[], roundNumber);
    } else {
        return pairSwiss(participants as Participant[], history, roundNumber);
    }
};

// --- Match Lifecycle ---
// Note: Import moved to top of file


/**
 * Start a match by creating a Woogles broadcast game
 */
export const startMatch = async (matchId: string, tournamentId: string) => {
    // 1. Fetch match and tournament details
    const { data: match, error: mErr } = await supabase
        .from('tournament_matches')
        .select('*, tournaments(*)')
        .eq('id', matchId)
        .single();

    if (mErr || !match) throw mErr || new Error('Match not found');

    // 2. Fetch player usernames (assumes users table has woogles_username or we use display_name)
    const { data: p1, error: p1Err } = await supabase
        .from('users')
        .select('display_name, woogles_username')
        .eq('id', match.player1_id)
        .single();

    const { data: p2, error: p2Err } = await supabase
        .from('users')
        .select('display_name, woogles_username')
        .eq('id', match.player2_id)
        .single();

    if (p1Err || p2Err || !p1 || !p2) {
        throw new Error('Could not fetch player data');
    }

    const tournament = match.tournaments;

    // 3. Create broadcast game on Woogles
    const config: WooglesGameConfig = {
        player1Username: p1.woogles_username || p1.display_name,
        player2Username: p2.woogles_username || p2.display_name,
        lexicon: tournament.lexicon as 'CSW21' | 'NWL23',
        timerMinutes: tournament.timer_minutes || 25,
        overtimeMinutes: tournament.timer_overtime_minutes || 1,
        tournamentName: tournament.name,
    };

    const wooglesGame = await createBroadcastGame(config);

    // 4. Update match with Woogles game info
    const { error: updateErr } = await supabase
        .from('tournament_matches')
        .update({
            woogles_game_id: wooglesGame.game_id,
            woogles_game_url: wooglesGame.game_url,
            status: 'live',
        })
        .eq('id', matchId);

    if (updateErr) throw updateErr;

    return wooglesGame;
};

/**
 * Poll a match for completion and update scores
 */
export const pollMatchResult = async (matchId: string) => {
    const { data: match, error } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', matchId)
        .single();

    if (error || !match || !match.woogles_game_id) return null;

    const result = await getGameResult(match.woogles_game_id);

    if (result && result.isFinished) {
        // Update match with final scores
        await supabase
            .from('tournament_matches')
            .update({
                score1: result.player1Score,
                score2: result.player2Score,
                status: 'finished',
            })
            .eq('id', matchId);

        // Update participant stats
        await updateParticipantStats(match.tournament_id, match.player1_id, match.player2_id, result);

        return result;
    }

    return null; // Game still in progress
};

/**
 * Update participant win/loss/spread after a match completes
 */
async function updateParticipantStats(
    tournamentId: string,
    player1Id: string,
    player2Id: string,
    result: { player1Score: number; player2Score: number; winner: string }
) {
    const spread1 = result.player1Score - result.player2Score;
    const spread2 = result.player2Score - result.player1Score;

    // Update Player 1
    if (result.winner === 'player1') {
        await supabase.rpc('increment_participant_stats', {
            p_tournament_id: tournamentId,
            p_user_id: player1Id,
            p_wins: 1,
            p_spread: spread1,
        });
        await supabase.rpc('increment_participant_stats', {
            p_tournament_id: tournamentId,
            p_user_id: player2Id,
            p_wins: 0,
            p_spread: spread2,
        });
    } else if (result.winner === 'player2') {
        await supabase.rpc('increment_participant_stats', {
            p_tournament_id: tournamentId,
            p_user_id: player1Id,
            p_wins: 0,
            p_spread: spread1,
        });
        await supabase.rpc('increment_participant_stats', {
            p_tournament_id: tournamentId,
            p_user_id: player2Id,
            p_wins: 1,
            p_spread: spread2,
        });
    } else {
        // Tie - 0.5 wins each
        await supabase.rpc('increment_participant_stats', {
            p_tournament_id: tournamentId,
            p_user_id: player1Id,
            p_wins: 0.5,
            p_spread: spread1,
        });
        await supabase.rpc('increment_participant_stats', {
            p_tournament_id: tournamentId,
            p_user_id: player2Id,
            p_wins: 0.5,
            p_spread: spread2,
        });
    }
}

