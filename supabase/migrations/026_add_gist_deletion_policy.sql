-- Add DELETE policy for gists
DROP POLICY IF EXISTS "Hosts can delete their gists" ON gists;
CREATE POLICY "Hosts can delete their gists"
  ON gists FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = gists.host_id
      AND users.auth_id = auth.uid()
    )
  );
