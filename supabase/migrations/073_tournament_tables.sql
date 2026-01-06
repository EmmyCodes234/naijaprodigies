-- Create Enums for Status Tracking
CREATE TYPE tournament_status AS ENUM ('setup', 'active', 'completed');
CREATE TYPE match_status AS ENUM ('pending', 'live', 'finished');
CREATE TYPE participant_status AS ENUM ('active', 'withdrawn');
CREATE TYPE pairing_system AS ENUM ('swiss', 'round_robin', 'koth');

-- Tournaments Table
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Config
    lexicon TEXT NOT NULL DEFAULT 'CSW21', -- CSW21 or NWL23
    round_count INTEGER NOT NULL DEFAULT 8,
    pairing_system pairing_system NOT NULL DEFAULT 'swiss',
    timer_minutes INTEGER NOT NULL DEFAULT 25,
    timer_overtime_minutes INTEGER NOT NULL DEFAULT 1,
    
    -- State
    status tournament_status DEFAULT 'setup',
    current_round INTEGER DEFAULT 0,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ
);

-- Participants Table
CREATE TABLE IF NOT EXISTS tournament_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Stats
    wins NUMERIC(4, 1) DEFAULT 0, -- Supports 0.5 for ties
    spread INTEGER DEFAULT 0,
    status participant_status DEFAULT 'active',
    
    -- Constraints
    UNIQUE(tournament_id, user_id)
);

-- Matches Table
CREATE TABLE IF NOT EXISTS tournament_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
    round_number INTEGER NOT NULL,
    
    -- Players (References participants table for easier stat lookups, or users?)
    -- Referencing users directly is often easier for UI, but referencing participants ensures they are in the tourney.
    -- Let's reference users for simplicity in queries, but ensure logic checks participation.
    player1_id UUID REFERENCES auth.users(id), -- Can be NULL for Bye? No, Bye handled as special case usually.
    player2_id UUID REFERENCES auth.users(id), -- NULL if Bye
    
    -- Game Data
    score1 INTEGER,
    score2 INTEGER,
    status match_status DEFAULT 'pending',
    
    -- Metadata
    woogles_game_id TEXT,
    woogles_game_url TEXT,
    is_bye BOOLEAN DEFAULT FALSE,
    table_number INTEGER
);

-- Indexes for performance
CREATE INDEX idx_tournaments_created_by ON tournaments(created_by);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_participants_tournament_user ON tournament_participants(tournament_id, user_id);
CREATE INDEX idx_matches_tournament_round ON tournament_matches(tournament_id, round_number);
CREATE INDEX idx_matches_players ON tournament_matches(player1_id, player2_id);


-- RLS Policies
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

-- Tournaments: Public Read, Director Write
CREATE POLICY "Public tournaments are viewable by everyone" ON tournaments
    FOR SELECT USING (true);

CREATE POLICY "Directors can create tournaments" ON tournaments
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Directors can update their tournaments" ON tournaments
    FOR UPDATE USING (auth.uid() = created_by);

-- Participants: Public Read, Director & Self Write
CREATE POLICY "Participants viewable by everyone" ON tournament_participants
    FOR SELECT USING (true);

CREATE POLICY "Directors can manage participants" ON tournament_participants
    FOR ALL USING (
        EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_participants.tournament_id AND created_by = auth.uid())
    );

CREATE POLICY "Users can join setup tournaments" ON tournament_participants
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND status = 'setup')
    );

-- Matches: Public Read, Director Write (Score entry mainly automated, but manual overrides needed)
CREATE POLICY "Matches viewable by everyone" ON tournament_matches
    FOR SELECT USING (true);

CREATE POLICY "Directors can manage matches" ON tournament_matches
    FOR ALL USING (
        EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_matches.tournament_id AND created_by = auth.uid())
    );

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tournaments table
CREATE TRIGGER handle_updated_at_tournaments
    BEFORE UPDATE ON tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
