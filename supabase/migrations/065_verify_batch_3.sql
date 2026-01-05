-- Grant green verification badges to Oyakhilome, Kanyin_l, and 03

UPDATE users
SET 
  verified = true,
  verification_type = 'green'
WHERE 
  handle IN ('Oyakhilome', 'Kanyin_l', '03');

-- Case insensitive match just in case
UPDATE users
SET 
  verified = true,
  verification_type = 'green'
WHERE 
  LOWER(handle) IN ('oyakhilome', 'kanyin_l', '03')
  AND verification_type != 'green';
