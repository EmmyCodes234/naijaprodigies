-- Add verification_type to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_type TEXT CHECK (verification_type IN ('none', 'green', 'gold', 'grey')) DEFAULT 'none';

-- Migrate existing verified users to the standard 'green' (individual) tier
UPDATE users SET verification_type = 'green' WHERE verified = true AND verification_type = 'none';
