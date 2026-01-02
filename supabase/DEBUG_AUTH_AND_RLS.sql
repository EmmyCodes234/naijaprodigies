-- DEBUG: Check authentication and RLS status
-- Run this in Supabase SQL Editor to diagnose the issue

-- Check 1: What is the current user?
SELECT 'Current authenticated user:' as check;
SELECT 
  auth.uid() as user_id,
  auth.jwt() as jwt_present,
  CASE 
    WHEN auth.uid() IS NULL THEN 'NOT AUTHENTICATED'
    ELSE 'AUTHENTICATED'
  END as auth_status;

-- Check 2: Is RLS enabled on tables?
SELECT 'RLS status on tables:' as check;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('conversations', 'conversation_participants', 'messages')
ORDER BY tablename;

-- Check 3: What policies exist?
SELECT 'Current policies:' as check;
SELECT 
  tablename,
  policyname,
  cmd as operation,
  permissive,
  CASE 
    WHEN roles = '{public}' THEN 'public'
    WHEN roles = '{authenticated}' THEN 'authenticated'
    ELSE array_to_string(roles, ', ')
  END as applies_to
FROM pg_policies 
WHERE tablename IN ('conversations', 'conversation_participants', 'messages')
ORDER BY tablename, cmd, policyname;

-- Check 4: Can we insert into conversations? (This will fail if RLS blocks it)
SELECT 'Testing INSERT permission:' as check;
-- This is just a test - we'll rollback
BEGIN;
  INSERT INTO conversations DEFAULT VALUES;
  SELECT 'INSERT SUCCEEDED - RLS allows it' as result;
ROLLBACK;

-- If the above failed, RLS is blocking. Let's check why:
SELECT 'Checking INSERT policy details:' as check;
SELECT 
  policyname,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'conversations' 
AND cmd = 'INSERT';
