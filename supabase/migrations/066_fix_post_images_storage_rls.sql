-- Fix Storage RLS for post-images bucket
-- This migration creates the actual storage.objects policies that were 
-- previously only documented in comments in 004_storage_policies.sql.

-- Drop any potentially conflicting policies first
DROP POLICY IF EXISTS "Public images are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- Policy 1: Public Read Access for post-images
CREATE POLICY "Public images are viewable by everyone"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-images');

-- Policy 2: Authenticated users can upload images to post-images
-- Simplified: any authenticated user can upload, service layer controls who owns what
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-images');

-- Policy 3: Users can update their own images
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'post-images' AND auth.uid() = owner);

-- Policy 4: Users can delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-images' AND auth.uid() = owner);
