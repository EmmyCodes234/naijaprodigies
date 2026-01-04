-- Grant Gold verification status to the creator (@emmycodes)
UPDATE users 
SET verification_type = 'gold' 
WHERE handle = 'emmycodes';
