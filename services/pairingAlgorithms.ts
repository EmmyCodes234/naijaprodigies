
// Pure pairing logic - No Supabase dependencies

export interface Participant {
    id: string;
    user_id: string;
    wins: number;
    spread: number;
    status: 'active' | 'withdrawn';
    opponentIds?: string[];
}

export interface Match {
    id: string;
    tournament_id: string;
    round_number: number;
    player1_id: string | null;
    player2_id: string | null;
    score1?: number;
    score2?: number;
    status: 'pending' | 'live' | 'finished';
    is_bye: boolean;
}

export function pairRoundRobin(participants: Participant[], round: number) {
    // Berger Table / Circle Method
    const pool = [...participants];

    // If odd, add a dummy 'BYE' player
    if (pool.length % 2 !== 0) {
        pool.push({ user_id: 'BYE', id: 'bye', wins: 0, spread: 0, status: 'active' });
    }

    const n = pool.length;
    const half = n / 2;
    const pairings: Partial<Match>[] = [];

    // Valid rounds are 1 to n-1. 
    // If round > n-1, it repeats (double round robin), or we can modulo.
    // Adjust round to 0-indexed for calculation: r = round - 1
    const r = (round - 1) % (n - 1);

    const movingIndices = pool.map((_, i) => i).slice(1); // [1, 2, ... n-1]

    // Rotate movingIndices by r steps
    const indices = [];
    indices.push(0); // Fixed point

    for (let i = 0; i < n - 1; i++) {
        let val = (i - r) % (n - 1);
        if (val < 0) val += (n - 1);
        indices.push(val + 1);
    }

    for (let i = 0; i < half; i++) {
        const p1Index = indices[i];
        const p2Index = indices[n - 1 - i];

        const p1 = pool[p1Index];
        const p2 = pool[p2Index];

        let realP1 = p1.user_id;
        let realP2 = p2.user_id;
        let isBye = false;

        if (realP1 === 'BYE') {
            realP1 = realP2;
            realP2 = null as any;
            isBye = true;
        } else if (realP2 === 'BYE') {
            realP2 = null as any;
            isBye = true;
        }

        pairings.push({
            player1_id: realP1,
            player2_id: realP2,
            is_bye: isBye
        });
    }

    return pairings;
}

export function pairKOTH(participants: Participant[]) {
    const ranked = [...participants].sort((a, b) => {
        if (a.wins !== b.wins) return b.wins - a.wins;
        return b.spread - a.spread;
    });

    const pairings: Partial<Match>[] = [];

    for (let i = 0; i < ranked.length; i += 2) {
        const p1 = ranked[i];
        const p2 = ranked[i + 1];

        if (!p2) {
            pairings.push({
                player1_id: p1.user_id,
                player2_id: null,
                is_bye: true
            });
        } else {
            pairings.push({
                player1_id: p1.user_id,
                player2_id: p2.user_id,
                is_bye: false
            });
        }
    }
    return pairings;
}

export function pairSwiss(participants: Participant[], history: Map<string, Set<string>>, round: number) {
    let pool = [...participants].sort((a, b) => {
        if (a.wins !== b.wins) return b.wins - a.wins;
        return b.spread - a.spread;
    });

    const pairings: Partial<Match>[] = [];

    if (pool.length % 2 !== 0) {
        // Find bye candidate: Lowest ranked player who hasn't had a bye?
        // For simple v1 implementation, we just take the last player.
        // TODO: In production, check 'hasBye' history.
        const byeCandidate = pool.pop();
        if (byeCandidate) {
            pairings.push({
                player1_id: byeCandidate.user_id,
                player2_id: null,
                is_bye: true
            });
        }
    }

    const used = new Set<string>();

    function findOpponent(p1Index: number): boolean {
        if (p1Index >= pool.length) return true;
        const p1 = pool[p1Index];

        if (used.has(p1.user_id)) return findOpponent(p1Index + 1);

        for (let i = p1Index + 1; i < pool.length; i++) {
            const p2 = pool[i];
            if (used.has(p2.user_id)) continue;

            if (history.get(p1.user_id)?.has(p2.user_id)) continue;

            used.add(p1.user_id);
            used.add(p2.user_id);
            pairings.push({ player1_id: p1.user_id, player2_id: p2.user_id });

            if (findOpponent(p1Index + 1)) return true;

            pairings.pop();
            used.delete(p1.user_id);
            used.delete(p2.user_id);
        }

        return false;
    }

    const success = findOpponent(0);

    if (!success) {
        console.warn("Could not find perfect pairings. Falling back to simple adjaceny.");
        // Fallback: Pair remaining adjacent players
        const remaining = pool.filter(p => !used.has(p.user_id));
        for (let i = 0; i < remaining.length; i += 2) {
            const p1 = remaining[i];
            const p2 = remaining[i + 1];
            if (p1 && p2) {
                pairings.push({ player1_id: p1.user_id, player2_id: p2.user_id });
            } else if (p1) {
                pairings.push({ player1_id: p1.user_id, player2_id: null, is_bye: true });
            }
        }
    }

    return pairings;
}
