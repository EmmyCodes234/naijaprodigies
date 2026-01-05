-- Create a new storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'message-attachments' );

-- Policy: Allow users to view key files (Making it public for MVP to avoid complex signed URL logic for now)
-- In a stricter E2EE system, we would disable public and use signed URLs for recipients.
CREATE POLICY "Public Access to Message Attachments"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'message-attachments' );

-- Policy: Allow users to delete their own uploads
CREATE POLICY "Users can delete own message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'message-attachments' AND auth.uid() = owner );
