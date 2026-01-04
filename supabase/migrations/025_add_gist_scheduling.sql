-- Add scheduling columns to gists
ALTER TABLE gists ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE;
ALTER TABLE gists ADD COLUMN IF NOT EXISTS description TEXT;

-- Update RLS policies to include new columns (usually handled by existing policies, but good to check)
-- "Users can create gists" with CHECK (auth.uid() = host_id) will already cover these new columns
