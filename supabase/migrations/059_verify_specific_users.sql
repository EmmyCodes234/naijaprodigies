-- Update users to have green ticks
-- Handles: MarsReborn, ExcelM, Oyakhilome, Kanyin_I

-- Ensure verification_type column exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_type TEXT DEFAULT 'none';

UPDATE users
SET 
  verified = true,
  verification_type = 'green'
WHERE 
  handle IN ('MarsReborn', 'ExcelM', 'Oyakhilome', 'Kanyin_I');

-- Also try case-insensitive match if the above didn't catch them
UPDATE users
SET 
  verified = true,
  verification_type = 'green'
WHERE 
  LOWER(handle) IN ('marsreborn', 'excelm', 'oyakhilome', 'kanyin_i');
