-- Add IV column to user_keys table
ALTER TABLE public.user_keys 
ADD COLUMN IF NOT EXISTS iv TEXT;

-- For existing rows (if any), we might need a default, but since keys are broken without IV, 
-- we can assume users will regenerate them or we leave it null.
-- The service logic upserts, so new keys will have IV.
