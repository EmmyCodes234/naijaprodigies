-- NSP TV: Live Games Table
-- Stores scraped live game data from woogles.io

CREATE TABLE IF NOT EXISTS live_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    woogles_game_id TEXT UNIQUE NOT NULL,
    player1_name TEXT NOT NULL,
    player2_name TEXT NOT NULL,
    player1_rating INTEGER,
    player2_rating INTEGER,
    lexicon TEXT,
    time_control TEXT,
    game_url TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'ended')),
    is_high_profile BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_live_games_status ON live_games(status);
CREATE INDEX IF NOT EXISTS idx_live_games_high_profile ON live_games(is_high_profile) WHERE is_high_profile = true;
CREATE INDEX IF NOT EXISTS idx_live_games_last_seen ON live_games(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_games_woogles_id ON live_games(woogles_game_id);

-- RLS Policies
ALTER TABLE live_games ENABLE ROW LEVEL SECURITY;

-- Anyone can view live games (public feature)
CREATE POLICY "Anyone can view live games"
    ON live_games FOR SELECT
    USING (true);

-- Only service role can insert/update/delete (from scraper)
CREATE POLICY "Service role can manage live games"
    ON live_games FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_live_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_live_games_updated_at
    BEFORE UPDATE ON live_games
    FOR EACH ROW
    EXECUTE FUNCTION update_live_games_updated_at();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE live_games;

-- Auto-mark high profile games (combined rating > 4000)
CREATE OR REPLACE FUNCTION check_high_profile_game()
RETURNS TRIGGER AS $$
BEGIN
    NEW.is_high_profile = COALESCE(NEW.player1_rating, 0) + COALESCE(NEW.player2_rating, 0) > 4000;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_high_profile
    BEFORE INSERT OR UPDATE ON live_games
    FOR EACH ROW
    EXECUTE FUNCTION check_high_profile_game();
