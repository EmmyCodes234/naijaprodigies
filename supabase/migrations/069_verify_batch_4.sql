-- Grant verification badges batch
-- thor_lawrence gets blue tick
-- Damilola gets blue tick
-- herkymn gets green tick

-- Blue tick for thor_lawrence
UPDATE users
SET 
  verified = true,
  verification_type = 'blue'
WHERE 
  handle = 'thor_lawrence' OR LOWER(handle) = 'thor_lawrence';

-- Blue tick for Damilola
UPDATE users
SET 
  verified = true,
  verification_type = 'blue'
WHERE 
  handle = 'Damilola' OR LOWER(handle) = 'damilola';

-- Green tick for herkymn
UPDATE users
SET 
  verified = true,
  verification_type = 'green'
WHERE 
  handle = 'herkymn' OR LOWER(handle) = 'herkymn';
