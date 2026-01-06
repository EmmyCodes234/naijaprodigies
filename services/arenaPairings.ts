// ============================================
// NSP Arena - Pairing Algorithms
// Swiss, Round Robin, Initial Fontes, KOTH, Team RR
// ============================================

import { ArenaParticipant, ArenaPairing } from './arenaService';

// ============================================
// TYPES
// ============================================

interface PairingInput {
    id: string;
    wins: number;
    losses: number;
    spread: number;
}

interface MatchHistory {
    [playerId: string]: Set<string>;
}

interface PairingResult {
    player1Id: string;
    player2Id: string | null;  // null = bye
    isBye: boolean;
}

// ============================================
// SWISS PAIRING
// ============================================

/**
 * Swiss pairing algorithm with max repeats control
 * Groups players by wins, then pairs within groups
 * Avoids rematches up to maxRepeats limit
 */
export function generateSwissPairings(
    participants: PairingInput[],
    history: MatchHistory,
    maxRepeats: number = 2
): PairingResult[] {
    const results: PairingResult[] = [];
    const available = [...participants].sort((a, b) =>
        b.wins - a.wins || b.spread - a.spread
    );

    const paired = new Set<string>();

    while (available.length > 0) {
        const player1 = available.shift()!;

        if (paired.has(player1.id)) continue;
        paired.add(player1.id);

        // Find best opponent (similar wins, not played too many times)
        let bestOpponent: PairingInput | null = null;
        let bestScore = -Infinity;

        for (const candidate of available) {
            if (paired.has(candidate.id)) continue;

            // Count previous meetings
            const prevMeetings = history[player1.id]?.has(candidate.id)
                ? Array.from(history[player1.id]).filter(id => id === candidate.id).length
                : 0;

            if (prevMeetings >= maxRepeats) continue;

            // Score: prefer similar wins, penalize repeats
            const winDiff = Math.abs(player1.wins - candidate.wins);
            const score = 100 - winDiff * 10 - prevMeetings * 5;

            if (score > bestScore) {
                bestScore = score;
                bestOpponent = candidate;
            }
        }

        if (bestOpponent) {
            paired.add(bestOpponent.id);
            available.splice(available.indexOf(bestOpponent), 1);

            results.push({
                player1Id: player1.id,
                player2Id: bestOpponent.id,
                isBye: false
            });
        } else {
            // Assign bye
            results.push({
                player1Id: player1.id,
                player2Id: null,
                isBye: true
            });
        }
    }

    return results;
}

// ============================================
// ROUND ROBIN (Berger Table)
// ============================================

/**
 * Round Robin using Berger Tables
 * Generates all pairings for a specific round
 */
export function generateRoundRobinPairings(
    participants: PairingInput[],
    roundNumber: number
): PairingResult[] {
    const n = participants.length;
    const isOdd = n % 2 === 1;

    // Add dummy for odd number
    const players = [...participants];
    if (isOdd) {
        players.push({ id: 'BYE', wins: 0, losses: 0, spread: 0 });
    }

    const numPlayers = players.length;
    const numRounds = numPlayers - 1;
    const adjustedRound = ((roundNumber - 1) % numRounds);

    const results: PairingResult[] = [];

    // Berger table rotation
    const fixed = players[0];
    const rotating = players.slice(1);

    // Rotate for this round
    const rotated = [...rotating];
    for (let i = 0; i < adjustedRound; i++) {
        rotated.push(rotated.shift()!);
    }

    // Create pairings
    const round = [fixed, ...rotated];
    const half = numPlayers / 2;

    for (let i = 0; i < half; i++) {
        const p1 = round[i];
        const p2 = round[numPlayers - 1 - i];

        if (p1.id === 'BYE') {
            results.push({
                player1Id: p2.id,
                player2Id: null,
                isBye: true
            });
        } else if (p2.id === 'BYE') {
            results.push({
                player1Id: p1.id,
                player2Id: null,
                isBye: true
            });
        } else {
            results.push({
                player1Id: p1.id,
                player2Id: p2.id,
                isBye: false
            });
        }
    }

    return results;
}

// ============================================
// INITIAL FONTES (Pod Round Robin)
// ============================================

/**
 * Initial Fontes - divide into pods, round robin within pods
 * Typically used for first rounds to avoid immediate repeats
 */
export function generateInitialFontesPairings(
    participants: PairingInput[],
    roundNumber: number,
    podsCount: number = 4
): PairingResult[] {
    const n = participants.length;
    const podSize = Math.ceil(n / podsCount);

    // Sort by seed/rating and distribute into pods (snake draft)
    const sorted = [...participants].sort((a, b) => b.spread - a.spread);
    const pods: PairingInput[][] = Array.from({ length: podsCount }, () => []);

    sorted.forEach((p, i) => {
        const podIndex = i % podsCount;
        pods[Math.floor(i / podsCount) % 2 === 0 ? podIndex : podsCount - 1 - podIndex].push(p);
    });

    // Generate round robin within each pod
    const results: PairingResult[] = [];

    for (const pod of pods) {
        if (pod.length < 2) {
            // Single player in pod gets bye
            if (pod.length === 1) {
                results.push({
                    player1Id: pod[0].id,
                    player2Id: null,
                    isBye: true
                });
            }
            continue;
        }

        const podPairings = generateRoundRobinPairings(pod, roundNumber);
        results.push(...podPairings);
    }

    return results;
}

// ============================================
// KING OF THE HILL (KOTH)
// ============================================

/**
 * King of the Hill - #1 plays #2, #3 plays #4, etc.
 * Pure standings-based pairing for competitive climax
 */
export function generateKOTHPairings(
    participants: PairingInput[]
): PairingResult[] {
    const sorted = [...participants].sort((a, b) =>
        b.wins - a.wins || b.spread - a.spread
    );

    const results: PairingResult[] = [];

    for (let i = 0; i < sorted.length; i += 2) {
        if (i + 1 < sorted.length) {
            results.push({
                player1Id: sorted[i].id,
                player2Id: sorted[i + 1].id,
                isBye: false
            });
        } else {
            // Odd player gets bye
            results.push({
                player1Id: sorted[i].id,
                player2Id: null,
                isBye: true
            });
        }
    }

    return results;
}

// ============================================
// TEAM ROUND ROBIN
// ============================================

interface TeamMember extends PairingInput {
    teamId: string;
}

/**
 * Team Round Robin - each team member plays every opponent team member
 */
export function generateTeamRoundRobinPairings(
    team1: TeamMember[],
    team2: TeamMember[],
    roundNumber: number
): PairingResult[] {
    const matchesPerRound = Math.min(team1.length, team2.length);
    const totalMatches = team1.length * team2.length;
    const roundsNeeded = Math.ceil(totalMatches / matchesPerRound);

    // Generate all possible matchups
    const allMatchups: PairingResult[] = [];
    for (const p1 of team1) {
        for (const p2 of team2) {
            allMatchups.push({
                player1Id: p1.id,
                player2Id: p2.id,
                isBye: false
            });
        }
    }

    // Return matchups for this round
    const startIdx = ((roundNumber - 1) % roundsNeeded) * matchesPerRound;
    return allMatchups.slice(startIdx, startIdx + matchesPerRound);
}

// ============================================
// HELPER: Build Match History
// ============================================

export function buildMatchHistory(
    pairings: Array<{ player1_id: string | null; player2_id: string | null }>
): MatchHistory {
    const history: MatchHistory = {};

    for (const p of pairings) {
        if (p.player1_id && p.player2_id) {
            if (!history[p.player1_id]) history[p.player1_id] = new Set();
            if (!history[p.player2_id]) history[p.player2_id] = new Set();

            history[p.player1_id].add(p.player2_id);
            history[p.player2_id].add(p.player1_id);
        }
    }

    return history;
}

// ============================================
// MAIN PAIRING GENERATOR
// ============================================

export function generatePairings(
    participants: ArenaParticipant[],
    roundNumber: number,
    pairingSystem: string,
    history: MatchHistory,
    maxRepeats: number = 2
): PairingResult[] {
    const inputs: PairingInput[] = participants
        .filter(p => p.is_active && p.checked_in)
        .map(p => ({
            id: p.id,
            wins: p.wins,
            losses: p.losses,
            spread: p.spread
        }));

    switch (pairingSystem) {
        case 'swiss':
            return generateSwissPairings(inputs, history, maxRepeats);

        case 'round_robin':
            return generateRoundRobinPairings(inputs, roundNumber);

        case 'initial_fontes':
            return generateInitialFontesPairings(inputs, roundNumber);

        case 'king_of_the_hill':
            return generateKOTHPairings(inputs);

        default:
            return generateSwissPairings(inputs, history, maxRepeats);
    }
}
