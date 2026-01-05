-- Fix RLS policies for user_keys table
-- Drop potentially conflicting or broad policies
DROP POLICY IF EXISTS "Users can manage their own keys" ON public.user_keys;
DROP POLICY IF EXISTS "Everyone can read user keys" ON public.user_keys;

-- Enable RLS just in case
ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Authenticated users can view keys of any user (needed for sending messages)
CREATE POLICY "Authenticated users can view keys" ON public.user_keys
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. INSERT: Users can insert their own keys
CREATE POLICY "Users can insert their own keys" ON public.user_keys
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Users can update their own keys
CREATE POLICY "Users can update their own keys" ON public.user_keys
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. DELETE: Users can delete their own keys
CREATE POLICY "Users can delete their own keys" ON public.user_keys
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
