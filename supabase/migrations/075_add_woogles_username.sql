-- Add woogles_username column to tournament_participants
-- This allows each player to register with their Woogles handle for the tournament
ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS woogles_username TEXT;

-- Add comment for clarity
COMMENT ON COLUMN tournament_participants.woogles_username IS 'Player Woogles.io username for creating games';
