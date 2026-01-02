# Messaging RLS Fix Instructions

## Problem
The direct messaging feature is failing with the error:
```
Error creating conversation: Error: Failed to create conversation: new row violates row-level security policy for table "conversations"
```

This happens because the Row Level Security (RLS) policies on the `conversations` table are incorrectly configured, preventing authenticated users from creating new conversations.

## Solution
Apply the RLS fix script to your Supabase database.

## Steps to Apply the Fix

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Copy the entire contents of [`FIX_MESSAGING_RLS.sql`](file:///c:/NSP%20Website/FIX_MESSAGING_RLS.sql) 
4. Paste it into the SQL Editor
5. Click **Run** to execute the script

### Option 2: Using Supabase CLI
If you have the Supabase CLI installed and configured:
```bash
supabase db push
```

## What the Fix Does
1. Drops the existing problematic RLS policies
2. Creates a helper function `is_conversation_participant` to prevent recursion issues
3. Recreates the RLS policies with proper configurations:
   - Fixes the `conversations` INSERT policy to properly allow authenticated users to create conversations
   - Fixes the `conversation_participants` policies to prevent infinite recursion
4. Verifies that the policies were correctly applied

## Verification
After applying the fix:
1. Try to message another user from their profile
2. The conversation should be created successfully without RLS errors
3. You can verify the policies were applied by running this query in the SQL Editor:
   ```sql
   SELECT 
     schemaname,
     tablename,
     policyname,
     permissive,
     roles,
     cmd
   FROM pg_policies 
   WHERE tablename IN ('conversations', 'conversation_participants')
   ORDER BY tablename, policyname;
   ```

## Additional Notes
- This fix is safe and maintains all security constraints
- Users can still only see conversations they participate in
- The fix resolves the infinite recursion issue documented in `docs/MESSAGING_RLS_FIX.md`