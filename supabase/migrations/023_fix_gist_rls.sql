-- Fix RLS policies for gists and gist_participants to match the auth_id pattern
-- Also update role check constraint for gist_participants

-- Update role check constraint
ALTER TABLE gist_participants DROP CONSTRAINT IF EXISTS gist_participants_role_check;
ALTER TABLE gist_participants ADD CONSTRAINT gist_participants_role_check 
  CHECK (role IN ('host', 'co-host', 'speaker', 'listener'));

-- Fix gists policies
DROP POLICY IF EXISTS "Users can create gists" ON gists;
CREATE POLICY "Users can create gists"
  ON gists FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = gists.host_id
      AND users.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hosts can update their gists" ON gists;
CREATE POLICY "Hosts can update their gists"
  ON gists FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = gists.host_id
      AND users.auth_id = auth.uid()
    )
  );

-- Fix gist_participants policies
DROP POLICY IF EXISTS "Users can join gists" ON gist_participants;
CREATE POLICY "Users can join gists"
  ON gist_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = gist_participants.user_id
      AND users.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own participant status" ON gist_participants;
CREATE POLICY "Users can update their own participant status"
  ON gist_participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = gist_participants.user_id
      AND users.auth_id = auth.uid()
    )
  );

-- Add policy for hosts/co-hosts to manage other participants
DROP POLICY IF EXISTS "Hosts and co-hosts can manage participants" ON gist_participants;
CREATE POLICY "Hosts and co-hosts can manage participants"
  ON gist_participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gist_participants gp
      WHERE gp.gist_id = gist_participants.gist_id
      AND gp.user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
      AND gp.role IN ('host', 'co-host')
    )
  );
