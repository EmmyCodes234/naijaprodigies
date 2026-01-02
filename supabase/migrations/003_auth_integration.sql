-- Update users table to link with Supabase auth
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for auth_id
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, handle, name, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'handle', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'avatar', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies to use auth_id
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = auth_id);

DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = posts.user_id
      AND users.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = posts.user_id
      AND users.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = posts.user_id
      AND users.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can like posts" ON likes;
CREATE POLICY "Authenticated users can like posts"
  ON likes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = likes.user_id
      AND users.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can unlike posts" ON likes;
CREATE POLICY "Users can unlike posts"
  ON likes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = likes.user_id
      AND users.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;
CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = comments.user_id
      AND users.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = comments.user_id
      AND users.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can follow others" ON follows;
CREATE POLICY "Authenticated users can follow others"
  ON follows FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = follows.follower_id
      AND users.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = follows.follower_id
      AND users.auth_id = auth.uid()
    )
  );
