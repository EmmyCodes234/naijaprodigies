-- Storage Bucket Setup
-- Note: This migration creates the bucket, but storage policies must be set up
-- through the Supabase Dashboard due to permission restrictions.
-- See STORAGE_SETUP.md for detailed instructions.

-- Create storage bucket for post images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies need to be created through the Supabase Dashboard:
-- 1. Go to Storage > post-images bucket > Policies
-- 2. Create the following policies:

/*
Policy 1: Public Read Access
- Policy Name: "Public images are viewable by everyone"
- Allowed Operation: SELECT
- Policy Definition:
  bucket_id = 'post-images'

Policy 2: Authenticated Upload
- Policy Name: "Authenticated users can upload images"
- Allowed Operation: INSERT
- Policy Definition:
  bucket_id = 'post-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM users WHERE auth_id = auth.uid()
  )

Policy 3: Update Own Images
- Policy Name: "Users can update own images"
- Allowed Operation: UPDATE
- Policy Definition:
  bucket_id = 'post-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM users WHERE auth_id = auth.uid()
  )

Policy 4: Delete Own Images
- Policy Name: "Users can delete own images"
- Allowed Operation: DELETE
- Policy Definition:
  bucket_id = 'post-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM users WHERE auth_id = auth.uid()
  )
*/
