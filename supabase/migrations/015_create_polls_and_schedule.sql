-- Add supporting columns to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS scheduled_for timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'gif')),
ADD COLUMN IF NOT EXISTS poll_id uuid DEFAULT NULL;

-- Create polls table
CREATE TABLE IF NOT EXISTS polls (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  question text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

-- Create poll options table
CREATE TABLE IF NOT EXISTS poll_options (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid REFERENCES polls(id) ON DELETE CASCADE,
  text text NOT NULL,
  display_order int NOT NULL
);

-- Create poll votes table
CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid REFERENCES polls(id) ON DELETE CASCADE,
  option_id uuid REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

-- Add foreign key to posts table after polls table creation
ALTER TABLE posts
ADD CONSTRAINT fk_posts_poll 
FOREIGN KEY (poll_id) 
REFERENCES polls(id) 
ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Policies for Polls
CREATE POLICY "Public polls are viewable by everyone" ON polls FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create polls" ON polls FOR INSERT TO authenticated WITH CHECK (true);

-- Policies for Options
CREATE POLICY "Public options are viewable by everyone" ON poll_options FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create options" ON poll_options FOR INSERT TO authenticated WITH CHECK (true);

-- Policies for Votes
CREATE POLICY "Public votes are viewable by everyone" ON poll_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON poll_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));
