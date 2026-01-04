-- Fix saved_posts RLS policies to correctly link with auth.uid() through users table
DROP POLICY IF EXISTS "Users can view their own saved posts" ON public.saved_posts;
CREATE POLICY "Users can view their own saved posts"
  ON public.saved_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = saved_posts.user_id
      AND users.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can save posts" ON public.saved_posts;
CREATE POLICY "Users can save posts"
  ON public.saved_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = saved_posts.user_id
      AND users.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can unsave posts" ON public.saved_posts;
CREATE POLICY "Users can unsave posts"
  ON public.saved_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = saved_posts.user_id
      AND users.auth_id = auth.uid()
    )
  );
