-- Phase 5: Self-Registration & Check-in System
-- Add columns to tournament_participants for registration workflow

-- Add woogles_username (required for game creation)
ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS woogles_username TEXT;

-- Add check-in tracking
ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE;

ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Track which round a player joined (for late arrivals)
ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS joined_round INTEGER DEFAULT 1;

-- Add losses column for forfeit tracking
ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS losses NUMERIC(4, 1) DEFAULT 0;

-- Comments for clarity
COMMENT ON COLUMN tournament_participants.woogles_username IS 'Player Woogles.io username for creating games';
COMMENT ON COLUMN tournament_participants.checked_in IS 'Has player checked in for tournament day?';
COMMENT ON COLUMN tournament_participants.joined_round IS 'Round number player joined (1 if on time, higher if late)';
COMMENT ON COLUMN tournament_participants.losses IS 'Player loss count including forfeits';

-- Add registration and check-in controls to tournaments
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS registration_open BOOLEAN DEFAULT TRUE;

ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS checkin_open BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN tournaments.registration_open IS 'Can new players register?';
COMMENT ON COLUMN tournaments.checkin_open IS 'Is check-in currently active?';
