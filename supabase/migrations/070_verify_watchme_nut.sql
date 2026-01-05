-- Grant green verification to Watchme.nut

UPDATE users
SET 
  verified = true,
  verification_type = 'green'
WHERE 
  handle = 'Watchme.nut' OR LOWER(handle) = 'watchme.nut';
