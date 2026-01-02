-- Create post_tags table
CREATE TABLE IF NOT EXISTS public.post_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster trend queries
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON public.post_tags(tag);
CREATE INDEX IF NOT EXISTS idx_post_tags_created_at ON public.post_tags(created_at);

-- RLS Policies
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

-- Everyone can read tags
CREATE POLICY "Everyone can read post tags" ON public.post_tags
    FOR SELECT USING (true);

-- Authenticated users can insert tags (via service, but policy needed for client-side if used directly)
-- Ideally, tags are inserted by the server or trigger, but for now we'll allow auth users to insert if they own the post.
-- Since we are doing it in the service which runs as the user, we need this.
CREATE POLICY "Users can insert tags for their own posts" ON public.post_tags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_tags.post_id AND posts.user_id = auth.uid()
        )
    );
