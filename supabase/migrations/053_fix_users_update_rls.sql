-- Fix users table RLS policy for UPDATE
-- The issue: auth.uid() returns the Supabase auth ID, but users.id is a custom UUID
-- We need to check that auth.uid() matches users.auth_id instead

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can update own profile" 
    ON public.users FOR UPDATE 
    TO authenticated
    USING (auth.uid() = auth_id)
    WITH CHECK (auth.uid() = auth_id);

-- Also fix the INSERT policy for consistency
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

CREATE POLICY "Users can insert their own profile" 
    ON public.users FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = auth_id);
