-- Allow users to "self-repair" their profile if missing
-- This fixes the "Foreign Key Constraint" error when following

-- 1. Ensure RLS is enabled on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Allow users to INSERT their own profile
-- (Normally this is done by a trigger, but if that fails, we need manual capability)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

CREATE POLICY "Users can insert their own profile" 
    ON public.users FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- 3. Ensure they can also UPDATE their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can update own profile" 
    ON public.users FOR UPDATE 
    USING (auth.uid() = id);

-- 4. Ensure everyone can view profiles (needed for FollowButton logic)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;

CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.users FOR SELECT 
    USING (true);

-- 5. Grant access
GRANT ALL ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;
