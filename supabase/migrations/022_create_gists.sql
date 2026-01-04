-- Create gists table
CREATE TABLE IF NOT EXISTS gists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  host_id UUID REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  topic TEXT,
  status TEXT CHECK (status IN ('live', 'ended', 'scheduled')) DEFAULT 'live',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gist_participants table
CREATE TABLE IF NOT EXISTS gist_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  gist_id UUID REFERENCES gists(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('host', 'speaker', 'listener')) DEFAULT 'listener',
  status TEXT CHECK (status IN ('active', 'left', 'requested_to_speak')) DEFAULT 'active',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  raised_hand BOOLEAN DEFAULT FALSE,
  UNIQUE(gist_id, user_id)
);

-- Enable RLS
ALTER TABLE gists ENABLE ROW LEVEL SECURITY;
ALTER TABLE gist_participants ENABLE ROW LEVEL SECURITY;

-- Policies for gists
DROP POLICY IF EXISTS "Gists are viewable by everyone" ON gists;
CREATE POLICY "Gists are viewable by everyone"
  ON gists FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create gists" ON gists;
CREATE POLICY "Users can create gists"
  ON gists FOR INSERT
  WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts can update their gists" ON gists;
CREATE POLICY "Hosts can update their gists"
  ON gists FOR UPDATE
  USING (auth.uid() = host_id);

-- Policies for gist_participants
DROP POLICY IF EXISTS "Participants are viewable by everyone" ON gist_participants;
CREATE POLICY "Participants are viewable by everyone"
  ON gist_participants FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can join gists" ON gist_participants;
CREATE POLICY "Users can join gists"
  ON gist_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own participant status" ON gist_participants;
CREATE POLICY "Users can update their own participant status"
  ON gist_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable Realtime
-- Note: You might need to run this manually in Supabase dashboard if replication fails, 
-- but usually adding tables to publication works if publication exists.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'gists') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE gists;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'gist_participants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE gist_participants;
  END IF;
END
$$;
