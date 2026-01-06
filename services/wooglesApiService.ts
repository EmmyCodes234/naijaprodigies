/**
 * Woogles.io API Service
 * Handles game creation, result polling, and GCG parsing for tournament integration.
 */

const WOOGLES_API_BASE = 'https://woogles.io/api';

// API Endpoints (gRPC-Web style)
const ENDPOINTS = {
    CREATE_BROADCAST_GAME: `${WOOGLES_API_BASE}/omgwords_service.GameEventService/CreateBroadcastGame`,
    GET_GAME_METADATA: `${WOOGLES_API_BASE}/game_service.GameMetadataService/GetMetadata`,
    GET_GCG: `${WOOGLES_API_BASE}/game_service.GameMetadataService/GetGCG`,
};

export interface WooglesGameConfig {
    player1Username: string;
    player2Username: string;
    lexicon: 'CSW21' | 'NWL23';
    timerMinutes: number;
    overtimeMinutes: number;
    tournamentName?: string;
}

export interface WooglesGameResponse {
    game_id: string;
    game_url: string;
}

export interface GameResult {
    player1Score: number;
    player2Score: number;
    winner: 'player1' | 'player2' | 'tie';
    isFinished: boolean;
}

/**
 * Create a broadcast game on Woogles.io
 * Both players will be redirected to play on the Woogles platform.
 */
export async function createBroadcastGame(config: WooglesGameConfig): Promise<WooglesGameResponse> {
    const apiKey = import.meta.env.VITE_WOOGLES_API_KEY;

    if (!apiKey) {
        throw new Error('WOOGLES_API_KEY not configured');
    }

    const payload = {
        player_vs_player: {
            player_1: config.player1Username,
            player_2: config.player2Username,
        },
        rules: {
            lexicon_name: config.lexicon,
            variant_name: 'classic',
            board_layout_name: 'CrosswordGame',
            letter_distribution_name: 'english',
        },
        initial_time_seconds: config.timerMinutes * 60,
        increment_seconds: 0,
        max_overtime_minutes: config.overtimeMinutes,
        rated: false, // Tournament games are typically unrated on Woogles
        tournament_id: config.tournamentName || 'NSP Tournament',
    };

    try {
        const response = await fetch(ENDPOINTS.CREATE_BROADCAST_GAME, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Woogles API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        return {
            game_id: data.game_id,
            game_url: `https://woogles.io/game/${data.game_id}`,
        };
    } catch (error) {
        console.error('Failed to create broadcast game:', error);
        throw error;
    }
}

/**
 * Poll a game to check if it's finished and get results.
 * Returns null if game is still in progress.
 */
export async function getGameResult(gameId: string): Promise<GameResult | null> {
    const apiKey = import.meta.env.VITE_WOOGLES_API_KEY;

    try {
        const response = await fetch(`${ENDPOINTS.GET_GAME_METADATA}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ game_id: gameId }),
        });

        if (!response.ok) {
            console.warn(`Failed to get game metadata for ${gameId}`);
            return null;
        }

        const data = await response.json();

        // Check if game is finished
        if (data.game_end_reason === 'NONE' || !data.game_end_reason) {
            return null; // Game still in progress
        }

        const player1Score = data.players?.[0]?.score || 0;
        const player2Score = data.players?.[1]?.score || 0;

        return {
            player1Score,
            player2Score,
            winner: player1Score > player2Score ? 'player1' :
                player2Score > player1Score ? 'player2' : 'tie',
            isFinished: true,
        };
    } catch (error) {
        console.error('Failed to get game result:', error);
        return null;
    }
}

/**
 * Parse GCG (Game Communication Group) format to extract final scores.
 * GCG is a standard Scrabble notation format.
 */
export async function parseGCG(gameId: string): Promise<GameResult | null> {
    const apiKey = import.meta.env.VITE_WOOGLES_API_KEY;

    try {
        const response = await fetch(`${ENDPOINTS.GET_GCG}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ game_id: gameId }),
        });

        if (!response.ok) {
            return null;
        }

        const gcgText = await response.text();

        // Parse GCG format - look for final scores
        // Format: >PlayerName: RACK MOVE SCORE TOTAL
        // Last moves contain final totals
        const lines = gcgText.split('\n').filter(Boolean);
        let player1Total = 0;
        let player2Total = 0;
        let player1Name = '';
        let player2Name = '';
        let currentPlayer = 0;

        for (const line of lines) {
            if (line.startsWith('#player1')) {
                player1Name = line.split(' ')[1] || 'Player 1';
            } else if (line.startsWith('#player2')) {
                player2Name = line.split(' ')[1] || 'Player 2';
            } else if (line.startsWith('>')) {
                // Move line - extract cumulative score
                const match = line.match(/>\s*\S+:\s*\S+\s+\S+\s+\d+\s+(\d+)/);
                if (match) {
                    const total = parseInt(match[1], 10);
                    if (line.includes(player1Name) || currentPlayer === 0) {
                        player1Total = total;
                        currentPlayer = 1;
                    } else {
                        player2Total = total;
                        currentPlayer = 0;
                    }
                }
            }
        }

        if (player1Total === 0 && player2Total === 0) {
            return null; // Couldn't parse scores
        }

        return {
            player1Score: player1Total,
            player2Score: player2Total,
            winner: player1Total > player2Total ? 'player1' :
                player2Total > player1Total ? 'player2' : 'tie',
            isFinished: true,
        };
    } catch (error) {
        console.error('Failed to parse GCG:', error);
        return null;
    }
}

/**
 * Open a Woogles game URL in a new tab.
 */
export function openWooglesGame(gameUrl: string): void {
    window.open(gameUrl, '_blank', 'noopener,noreferrer');
}
