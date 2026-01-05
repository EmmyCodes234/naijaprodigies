-- Grant green verification badges to ScrabbleGM and petrock

UPDATE users
SET 
  verified = true,
  verification_type = 'green'
WHERE 
  handle IN ('ScrabbleGM', 'petrock');

-- Case insensitive match just in case
UPDATE users
SET 
  verified = true,
  verification_type = 'green'
WHERE 
  LOWER(handle) IN ('scrabblegm', 'petrock')
  AND verification_type != 'green';
