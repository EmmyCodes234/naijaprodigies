-- Allow 'blue' in verification_type check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_verification_type_check;

ALTER TABLE users ADD CONSTRAINT users_verification_type_check 
CHECK (verification_type IN ('none', 'green', 'gold', 'grey', 'blue'));

-- Update users to have blue ticks
-- Handles: Watchme.nut, Damilola, L_amhim, user_f349bc96, user_0cd1ccf0

UPDATE users
SET 
  verified = true,
  verification_type = 'blue'
WHERE 
  handle IN ('Watchme.nut', 'Damilola', 'L_amhim', 'user_f349bc96', 'user_0cd1ccf0');

-- Case insensitive match just in case
UPDATE users
SET 
  verified = true,
  verification_type = 'blue'
WHERE 
  LOWER(handle) IN ('watchme.nut', 'damilola', 'l_amhim', 'user_f349bc96', 'user_0cd1ccf0')
  AND verification_type != 'blue'; 
