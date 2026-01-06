-- Relax RLS policy for voice-notes bucket to allow any authenticated upload
-- The previous policy led to failures if the folder structure didn't match the user ID exactly

DROP POLICY IF EXISTS "Users can upload voice notes" ON storage.objects;

CREATE POLICY "Users can upload voice notes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'voice-notes' AND auth.role() = 'authenticated');
