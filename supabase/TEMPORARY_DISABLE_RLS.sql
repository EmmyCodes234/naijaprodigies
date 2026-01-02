-- TEMPORARY: Disable RLS for testing
-- ⚠️ WARNING: This removes security! Only use for testing!
-- ⚠️ Remember to re-enable RLS after testing!

-- Disable RLS on messaging tables
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

SELECT 'RLS DISABLED - Test your app now' as status;
SELECT 'Remember to re-enable RLS after testing!' as warning;

-- To re-enable RLS, run:
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
