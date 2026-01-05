-- Fix RLS policies for user_keys table
-- The issue: user_keys.user_id references users.id (custom UUID),
-- but auth.uid() returns the Supabase auth user ID (stored as users.auth_id).
-- We need to check if the user_keys.user_id belongs to the current auth user.

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can manage their own keys" ON public.user_keys;
DROP POLICY IF EXISTS "Everyone can read user keys" ON public.user_keys;
DROP POLICY IF EXISTS "Authenticated users can view keys" ON public.user_keys;
DROP POLICY IF EXISTS "Users can insert their own keys" ON public.user_keys;
DROP POLICY IF EXISTS "Users can update their own keys" ON public.user_keys;
DROP POLICY IF EXISTS "Users can delete their own keys" ON public.user_keys;

-- Enable RLS
ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Authenticated users can view keys of any user (needed for sending messages)
CREATE POLICY "Authenticated users can view keys" ON public.user_keys
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. INSERT: Users can insert keys for their own profile
-- Check that the user_id being inserted matches a users row where auth_id = auth.uid()
CREATE POLICY "Users can insert their own keys" ON public.user_keys
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = user_id
            AND users.auth_id = auth.uid()
        )
    );

-- 3. UPDATE: Users can update keys for their own profile
CREATE POLICY "Users can update their own keys" ON public.user_keys
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = user_id
            AND users.auth_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = user_id
            AND users.auth_id = auth.uid()
        )
    );

-- 4. DELETE: Users can delete keys for their own profile
CREATE POLICY "Users can delete their own keys" ON public.user_keys
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = user_id
            AND users.auth_id = auth.uid()
        )
    );
