-- Fix RLS policies for follows table

-- 1. Ensure RLS is enabled
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
DROP POLICY IF EXISTS "Authenticated users can follow others" ON public.follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;

-- 3. Re-create policies

-- SELECT: Allow everyone to see follows (needed for counts and lists)
CREATE POLICY "Follows are viewable by everyone" 
    ON public.follows FOR SELECT 
    USING (true);

-- INSERT: Allow authenticated users to follow (create a record)
-- Must match auth.uid()
CREATE POLICY "Authenticated users can follow others" 
    ON public.follows FOR INSERT 
    WITH CHECK (auth.uid() = follower_id);

-- DELETE: Allow users to unfollow (delete their own record)
CREATE POLICY "Users can unfollow" 
    ON public.follows FOR DELETE 
    USING (auth.uid() = follower_id);

-- 4. Grant access
GRANT ALL ON public.follows TO authenticated;
GRANT SELECT ON public.follows TO anon;
