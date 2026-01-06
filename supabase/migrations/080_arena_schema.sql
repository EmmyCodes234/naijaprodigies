-- ============================================
-- NSP ARENA - Database Schema
-- Phase 1: Foundation Tables
-- ============================================

-- Drop existing tournament tables if they exist (clean slate)
DROP TABLE IF EXISTS tournament_chat CASCADE;
DROP TABLE IF EXISTS arena_games CASCADE;
DROP TABLE IF EXISTS arena_pairings CASCADE;
DROP TABLE IF EXISTS arena_rounds CASCADE;
DROP TABLE IF EXISTS arena_participants CASCADE;
DROP TABLE IF EXISTS arena_divisions CASCADE;
DROP TABLE IF EXISTS arena_tournaments CASCADE;

-- ============================================
-- ENUMS
-- ============================================

-- Drop existing types if they exist (for re-running)
DROP TYPE IF EXISTS pairing_system CASCADE;
DROP TYPE IF EXISTS arena_tournament_status CASCADE;
DROP TYPE IF EXISTS arena_round_status CASCADE;
DROP TYPE IF EXISTS arena_game_status CASCADE;

-- Pairing system types
CREATE TYPE pairing_system AS ENUM (
    'swiss',
    'round_robin',
    'initial_fontes',
    'king_of_the_hill',
    'team_round_robin',
    'manual'
);

-- Tournament status
CREATE TYPE arena_tournament_status AS ENUM (
    'draft',        -- Being set up
    'registration', -- Open for registration
    'active',       -- Tournament in progress
    'completed',    -- Finished
    'cancelled'     -- Cancelled
);

-- Round status
CREATE TYPE arena_round_status AS ENUM (
    'pending',      -- Not yet started
    'active',       -- Games in progress
    'completed'     -- All games finished
);

-- Game status
CREATE TYPE arena_game_status AS ENUM (
    'pending',      -- Awaiting start
    'live',         -- In progress on Woogles
    'completed',    -- Finished with result
    'forfeit',      -- One or both forfeited
    'bye'           -- Bye game
);

-- ============================================
-- TOURNAMENTS TABLE
-- ============================================
CREATE TABLE arena_tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    director_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Dates
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    registration_deadline TIMESTAMPTZ,
    
    -- Settings
    status arena_tournament_status DEFAULT 'draft',
    is_public BOOLEAN DEFAULT TRUE,
    max_players INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DIVISIONS TABLE
-- ============================================
CREATE TABLE arena_divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES arena_tournaments(id) ON DELETE CASCADE,
    
    -- Division info
    name TEXT NOT NULL,              -- "Division A", "Open", "Novice"
    description TEXT,
    sort_order INTEGER DEFAULT 0,     -- Display order
    
    -- Game settings
    lexicon TEXT DEFAULT 'CSW21',
    time_control_initial INTEGER DEFAULT 25,     -- Minutes
    time_control_increment INTEGER DEFAULT 0,    -- Seconds per move
    challenge_rule TEXT DEFAULT 'double',        -- single, double, five_point
    
    -- Rating restrictions (optional)
    min_rating INTEGER,
    max_rating INTEGER,
    
    -- Round config
    total_rounds INTEGER DEFAULT 7,
    current_round INTEGER DEFAULT 0,
    
    -- Settings
    max_repeats INTEGER DEFAULT 2,   -- Max times two players can meet
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PARTICIPANTS TABLE
-- ============================================
CREATE TABLE arena_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division_id UUID NOT NULL REFERENCES arena_divisions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Player info
    display_name TEXT NOT NULL,
    woogles_username TEXT,
    rating INTEGER,
    
    -- Stats
    wins NUMERIC(4,1) DEFAULT 0,
    losses NUMERIC(4,1) DEFAULT 0,
    spread INTEGER DEFAULT 0,
    
    -- Tiebreakers
    opponent_wins NUMERIC(6,1) DEFAULT 0,      -- Total opponent wins (Solkoff)
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,            -- False if withdrawn
    checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    seed INTEGER,                              -- Initial seeding
    
    -- For late arrivals
    joined_round INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(division_id, user_id)
);

-- ============================================
-- ROUNDS TABLE
-- ============================================
CREATE TABLE arena_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division_id UUID NOT NULL REFERENCES arena_divisions(id) ON DELETE CASCADE,
    
    round_number INTEGER NOT NULL,
    pairing_system pairing_system DEFAULT 'swiss',
    status arena_round_status DEFAULT 'pending',
    
    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(division_id, round_number)
);

-- ============================================
-- PAIRINGS TABLE
-- ============================================
CREATE TABLE arena_pairings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES arena_rounds(id) ON DELETE CASCADE,
    
    -- Players
    player1_id UUID REFERENCES arena_participants(id),
    player2_id UUID REFERENCES arena_participants(id),  -- NULL for bye
    
    -- Assignment
    table_number INTEGER,
    is_bye BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GAMES TABLE (Results)
-- ============================================
CREATE TABLE arena_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pairing_id UUID NOT NULL REFERENCES arena_pairings(id) ON DELETE CASCADE,
    
    -- Scores
    score1 INTEGER,                  -- Player 1 score
    score2 INTEGER,                  -- Player 2 score
    
    -- Result
    winner_id UUID REFERENCES arena_participants(id),
    spread INTEGER,                  -- score1 - score2 (can be negative)
    
    -- Status
    status arena_game_status DEFAULT 'pending',
    
    -- Woogles integration
    woogles_game_id TEXT,
    woogles_game_url TEXT,
    
    -- Forfeit tracking
    forfeit_player_id UUID REFERENCES arena_participants(id),
    is_double_forfeit BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TOURNAMENT CHAT TABLE
-- ============================================
CREATE TABLE tournament_chat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES arena_tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Message content
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',  -- 'text', 'announcement', 'system'
    
    -- Director flag
    is_director_message BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Tournaments
CREATE INDEX idx_arena_tournaments_director ON arena_tournaments(director_id);
CREATE INDEX idx_arena_tournaments_status ON arena_tournaments(status);

-- Divisions
CREATE INDEX idx_arena_divisions_tournament ON arena_divisions(tournament_id);

-- Participants
CREATE INDEX idx_arena_participants_division ON arena_participants(division_id);
CREATE INDEX idx_arena_participants_user ON arena_participants(user_id);
CREATE INDEX idx_arena_participants_standings ON arena_participants(division_id, wins DESC, spread DESC);

-- Rounds
CREATE INDEX idx_arena_rounds_division ON arena_rounds(division_id);

-- Pairings
CREATE INDEX idx_arena_pairings_round ON arena_pairings(round_id);
CREATE INDEX idx_arena_pairings_players ON arena_pairings(player1_id, player2_id);

-- Games
CREATE INDEX idx_arena_games_pairing ON arena_games(pairing_id);
CREATE INDEX idx_arena_games_status ON arena_games(status);

-- Chat
CREATE INDEX idx_tournament_chat_tournament ON tournament_chat(tournament_id);
CREATE INDEX idx_tournament_chat_created ON tournament_chat(tournament_id, created_at DESC);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_arena_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_arena_tournaments_updated
    BEFORE UPDATE ON arena_tournaments
    FOR EACH ROW EXECUTE FUNCTION update_arena_updated_at();

CREATE TRIGGER trigger_arena_divisions_updated
    BEFORE UPDATE ON arena_divisions
    FOR EACH ROW EXECUTE FUNCTION update_arena_updated_at();

CREATE TRIGGER trigger_arena_participants_updated
    BEFORE UPDATE ON arena_participants
    FOR EACH ROW EXECUTE FUNCTION update_arena_updated_at();

CREATE TRIGGER trigger_arena_games_updated
    BEFORE UPDATE ON arena_games
    FOR EACH ROW EXECUTE FUNCTION update_arena_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE arena_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_chat ENABLE ROW LEVEL SECURITY;

-- TOURNAMENTS: Anyone can view public, directors can manage their own
CREATE POLICY "Anyone can view public tournaments"
    ON arena_tournaments FOR SELECT
    USING (is_public = TRUE OR director_id = auth.uid());

CREATE POLICY "Directors can insert tournaments"
    ON arena_tournaments FOR INSERT
    WITH CHECK (director_id = auth.uid());

CREATE POLICY "Directors can update their tournaments"
    ON arena_tournaments FOR UPDATE
    USING (director_id = auth.uid());

CREATE POLICY "Directors can delete their tournaments"
    ON arena_tournaments FOR DELETE
    USING (director_id = auth.uid());

-- DIVISIONS: Visible if tournament is visible
CREATE POLICY "Divisions visible with tournament"
    ON arena_divisions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM arena_tournaments t 
            WHERE t.id = tournament_id 
            AND (t.is_public = TRUE OR t.director_id = auth.uid())
        )
    );

CREATE POLICY "Directors can manage divisions"
    ON arena_divisions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM arena_tournaments t 
            WHERE t.id = tournament_id 
            AND t.director_id = auth.uid()
        )
    );

-- PARTICIPANTS: Visible within tournament
CREATE POLICY "Participants visible with division"
    ON arena_participants FOR SELECT
    USING (TRUE);

CREATE POLICY "Users can register themselves"
    ON arena_participants FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own registration"
    ON arena_participants FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Directors can manage participants"
    ON arena_participants FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM arena_divisions d
            JOIN arena_tournaments t ON t.id = d.tournament_id
            WHERE d.id = division_id 
            AND t.director_id = auth.uid()
        )
    );

-- ROUNDS: Visible within division
CREATE POLICY "Rounds visible"
    ON arena_rounds FOR SELECT
    USING (TRUE);

CREATE POLICY "Directors can manage rounds"
    ON arena_rounds FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM arena_divisions d
            JOIN arena_tournaments t ON t.id = d.tournament_id
            WHERE d.id = division_id 
            AND t.director_id = auth.uid()
        )
    );

-- PAIRINGS: Visible within round
CREATE POLICY "Pairings visible"
    ON arena_pairings FOR SELECT
    USING (TRUE);

CREATE POLICY "Directors can manage pairings"
    ON arena_pairings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM arena_rounds r
            JOIN arena_divisions d ON d.id = r.division_id
            JOIN arena_tournaments t ON t.id = d.tournament_id
            WHERE r.id = round_id 
            AND t.director_id = auth.uid()
        )
    );

-- GAMES: Visible within pairing
CREATE POLICY "Games visible"
    ON arena_games FOR SELECT
    USING (TRUE);

CREATE POLICY "Directors can manage games"
    ON arena_games FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM arena_pairings p
            JOIN arena_rounds r ON r.id = p.round_id
            JOIN arena_divisions d ON d.id = r.division_id
            JOIN arena_tournaments t ON t.id = d.tournament_id
            WHERE p.id = pairing_id 
            AND t.director_id = auth.uid()
        )
    );

-- CHAT: Visible within tournament, participants can post
CREATE POLICY "Chat visible in tournament"
    ON tournament_chat FOR SELECT
    USING (TRUE);

CREATE POLICY "Authenticated users can post in chat"
    ON tournament_chat FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE arena_tournaments IS 'NSP Arena tournament events';
COMMENT ON TABLE arena_divisions IS 'Divisions within a tournament (e.g., Open, Novice)';
COMMENT ON TABLE arena_participants IS 'Player registrations per division';
COMMENT ON TABLE arena_rounds IS 'Round configuration and status';
COMMENT ON TABLE arena_pairings IS 'Match pairings for each round';
COMMENT ON TABLE arena_games IS 'Game results and Woogles integration';
COMMENT ON TABLE tournament_chat IS 'Unified chat for tournament participants and director';
