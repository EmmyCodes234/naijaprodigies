-- Fix RLS policies for follows table (Regression fix from 041)
-- The previous policy incorrectly compared auth.uid() (Auth ID) directly with follower_id (Profile ID).
-- Since Profile IDs != Auth IDs, we must check the link via the users table.

-- 1. Drop incorrect policies
DROP POLICY IF EXISTS "Authenticated users can follow others" ON public.follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;

-- 2. Create correct policies

-- INSERT: active user must own the 'follower_id' profile
CREATE POLICY "Authenticated users can follow others" 
    ON public.follows FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = follows.follower_id
            AND auth_id = auth.uid()
        )
    );

-- DELETE: active user must own the 'follower_id' profile
CREATE POLICY "Users can unfollow" 
    ON public.follows FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = follows.follower_id
            AND auth_id = auth.uid()
        )
    );
