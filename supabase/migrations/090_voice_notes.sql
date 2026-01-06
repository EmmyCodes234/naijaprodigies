-- ============================================
-- Voice Notes Feature
-- Adds audio support to posts
-- ============================================

-- Add voice note columns to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_duration_ms INTEGER;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_transcript TEXT;

-- Create storage bucket for voice notes (run manually in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('voice-notes', 'voice-notes', true);

-- Storage policies for voice-notes bucket
-- Allow authenticated users to upload
CREATE POLICY "Users can upload voice notes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'voice-notes' AND auth.role() = 'authenticated');

-- Allow anyone to view voice notes (public)
CREATE POLICY "Voice notes are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'voice-notes');

-- Allow users to delete their own voice notes
CREATE POLICY "Users can delete own voice notes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Index for posts with audio
CREATE INDEX IF NOT EXISTS idx_posts_has_audio ON posts (audio_url) WHERE audio_url IS NOT NULL;

-- Comment
COMMENT ON COLUMN posts.audio_url IS 'URL to voice note audio file in Supabase Storage';
COMMENT ON COLUMN posts.audio_duration_ms IS 'Duration of voice note in milliseconds (max 15000)';
COMMENT ON COLUMN posts.audio_transcript IS 'AI-generated transcript of voice note for accessibility';
