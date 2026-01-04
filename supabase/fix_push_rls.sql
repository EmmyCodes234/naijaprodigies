-- Fix RLS policies for push_subscriptions

-- 1. Ensure RLS is enabled
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.push_subscriptions;

-- 3. Create comprehensive policies

-- INSERT: Check if user_id matches auth.uid()
CREATE POLICY "Users can insert their own subscriptions" 
    ON public.push_subscriptions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- SELECT: Check if user_id matches auth.uid()
CREATE POLICY "Users can view their own subscriptions" 
    ON public.push_subscriptions FOR SELECT 
    USING (auth.uid() = user_id);

-- DELETE: Check if user_id matches auth.uid()
CREATE POLICY "Users can delete their own subscriptions" 
    ON public.push_subscriptions FOR DELETE 
    USING (auth.uid() = user_id);

-- UPDATE: Allow updates (User Agent changes, etc.)
CREATE POLICY "Users can update their own subscriptions" 
    ON public.push_subscriptions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Grant access to authenticated users
GRANT ALL ON public.push_subscriptions TO authenticated;
