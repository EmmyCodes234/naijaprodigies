-- Comment Reactions Schema
-- Adds likes functionality to comments

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Enable RLS
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view likes
CREATE POLICY "Comment likes are viewable by everyone"
ON comment_likes FOR SELECT
TO public
USING (true);

-- Authenticated users can like comments
CREATE POLICY "Authenticated users can like comments"
ON comment_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IN (SELECT auth_id FROM users WHERE id = user_id));

-- Users can unlike their own likes
CREATE POLICY "Users can unlike their own likes"
ON comment_likes FOR DELETE
TO authenticated
USING (auth.uid() IN (SELECT auth_id FROM users WHERE id = user_id));
