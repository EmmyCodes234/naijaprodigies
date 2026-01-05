-- Grant verification badges
-- matachini gets gold tick
-- ScrabbleGM gets green tick

-- Gold tick for matachini
UPDATE users
SET 
  verified = true,
  verification_type = 'gold'
WHERE 
  handle = 'matachini' OR LOWER(handle) = 'matachini';

-- Green tick for ScrabbleGM
UPDATE users
SET 
  verified = true,
  verification_type = 'green'
WHERE 
  handle = 'ScrabbleGM' OR LOWER(handle) = 'scrabblegm';
