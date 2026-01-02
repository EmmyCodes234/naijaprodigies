-- VERIFY RLS POLICIES SCRIPT
-- Run this in your Supabase SQL Editor to check current RLS policies

-- Check if RLS is enabled on messaging tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('conversations', 'conversation_participants', 'messages')
ORDER BY tablename;

-- Check current policies on conversations table
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'conversations'
ORDER BY policyname;

-- Check current policies on conversation_participants table
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'conversation_participants'
ORDER BY policyname;

-- Test authentication context (this will show your current user context)
SELECT 
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN 'NOT AUTHENTICATED'
    ELSE 'AUTHENTICATED'
  END as auth_status;