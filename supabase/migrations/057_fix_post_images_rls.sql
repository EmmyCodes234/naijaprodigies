-- Fix RLS by denormalizing user_id to post_images
-- This avoids the join on 'posts' for the INSERT check, which can be flaky or slow

-- 1. Add user_id column
ALTER TABLE post_images ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Backfill existing data
UPDATE post_images 
SET user_id = posts.user_id
FROM posts
WHERE post_images.post_id = posts.id
AND post_images.user_id IS NULL;

-- 3. Make it required (optional, but good for data integrity after backfill)
-- ALTER TABLE post_images ALTER COLUMN user_id SET NOT NULL; 

-- 4. Drop old policy
DROP POLICY IF EXISTS "Users can add images to own posts" ON post_images;
DROP POLICY IF EXISTS "Users can delete images from own posts" ON post_images;

-- 5. Create new simplified policies
CREATE POLICY "Users can add images to own posts"
ON post_images FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete images from own posts"
ON post_images FOR DELETE
USING (auth.uid() = user_id);
