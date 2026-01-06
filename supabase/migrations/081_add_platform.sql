-- Add platform enum
CREATE TYPE arena_platform AS ENUM (
    'woogles',
    'live',
    'other'
);

-- Add platform column to arena_tournaments
ALTER TABLE arena_tournaments 
ADD COLUMN platform arena_platform DEFAULT 'woogles';
