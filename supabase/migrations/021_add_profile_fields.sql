-- Add profile fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Index for searching (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_users_handle ON users(handle);
