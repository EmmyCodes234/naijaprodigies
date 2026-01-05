-- Fix RLS policies for tables that incorrectly use auth.uid() = user_id
-- The issue: These tables have user_id referencing users.id (custom UUID),
-- but auth.uid() returns the Supabase auth user ID (stored as users.auth_id).
-- We need to check if the user_id belongs to the current auth user.

-- ============================================
-- FIX: gists table (host_id references users.id)
-- ============================================
DROP POLICY IF EXISTS "Users can create gists" ON gists;
DROP POLICY IF EXISTS "Hosts can update their gists" ON gists;
DROP POLICY IF EXISTS "Hosts can delete their gists" ON gists;

CREATE POLICY "Users can create gists" ON gists
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = host_id
            AND users.auth_id = auth.uid()
        )
    );

CREATE POLICY "Hosts can update their gists" ON gists
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = host_id
            AND users.auth_id = auth.uid()
        )
    );

CREATE POLICY "Hosts can delete their gists" ON gists
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = host_id
            AND users.auth_id = auth.uid()
        )
    );

-- ============================================
-- FIX: gist_participants table (user_id references users.id)
-- ============================================
DROP POLICY IF EXISTS "Users can join gists" ON gist_participants;
DROP POLICY IF EXISTS "Users can update their own participant status" ON gist_participants;

CREATE POLICY "Users can join gists" ON gist_participants
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = user_id
            AND users.auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own participant status" ON gist_participants
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = user_id
            AND users.auth_id = auth.uid()
        )
    );

-- ============================================
-- FIX: saved_posts table (user_id references users.id)
-- ============================================
DROP POLICY IF EXISTS "Users can view their own saved posts" ON saved_posts;
DROP POLICY IF EXISTS "Users can save posts" ON saved_posts;
DROP POLICY IF EXISTS "Users can unsave posts" ON saved_posts;

CREATE POLICY "Users can view their own saved posts" ON saved_posts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = user_id
            AND users.auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can save posts" ON saved_posts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = user_id
            AND users.auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can unsave posts" ON saved_posts
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = user_id
            AND users.auth_id = auth.uid()
        )
    );

-- ============================================
-- FIX: notifications table (user_id references users.id)
-- ============================================
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = user_id
            AND users.auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = user_id
            AND users.auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = user_id
            AND users.auth_id = auth.uid()
        )
    );
