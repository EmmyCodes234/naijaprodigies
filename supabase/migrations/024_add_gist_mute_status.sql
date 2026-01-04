-- Add is_muted to gist_participants
ALTER TABLE gist_participants ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT true;

-- Update existing participants to be muted by default
UPDATE gist_participants SET is_muted = true WHERE is_muted IS NULL;
