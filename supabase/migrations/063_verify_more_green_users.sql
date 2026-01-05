-- Grant green verification badges to Scrabble_mike and Joyous_scrabbler

UPDATE users
SET 
  verified = true,
  verification_type = 'green'
WHERE 
  handle IN ('Scrabble_mike', 'Joyous_scrabbler');

-- Case insensitive match just in case
UPDATE users
SET 
  verified = true,
  verification_type = 'green'
WHERE 
  LOWER(handle) IN ('scrabble_mike', 'joyous_scrabbler')
  AND verification_type != 'green';
