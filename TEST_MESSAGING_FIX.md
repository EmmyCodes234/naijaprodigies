# Testing the Messaging RLS Fix

## Prerequisites
1. Applied the RLS fix using [`FIX_MESSAGING_RLS.sql`](file:///c:/NSP%20Website/FIX_MESSAGING_RLS.sql) or confirmed it's already applied
2. Have at least two user accounts in your database
3. Both users are properly authenticated

## Test Procedure

### Test 1: Create New Conversation
1. Sign in as User A
2. Navigate to User B's profile
3. Click the "Message" button
4. Verify:
   - You are redirected to the messages page
   - A new conversation is created between User A and User B
   - No RLS errors appear in the console

### Test 2: Existing Conversation
1. Ensure a conversation already exists between User A and User B
2. Sign in as User A
3. Navigate to User B's profile
4. Click the "Message" button
5. Verify:
   - You are redirected to the existing conversation
   - No duplicate conversations are created
   - No RLS errors appear in the console

### Test 3: Send Message
1. Open an existing or new conversation
2. Send a message
3. Verify:
   - Message appears in the conversation
   - Message is saved to the database
   - No RLS errors appear in the console

## Expected Results
- All tests should pass without RLS policy violations
- Conversations should be created successfully for new user pairs
- Existing conversations should be reused
- Messages should send and be received properly

## Troubleshooting
If you still encounter RLS errors:

1. Verify the policies are applied:
   ```sql
   SELECT 
     schemaname,
     tablename,
     policyname,
     permissive,
     roles,
     cmd
   FROM pg_policies 
   WHERE tablename IN ('conversations', 'conversation_participants', 'messages')
   ORDER BY tablename, policyname;
   ```

2. Check that you have the correct policies:
   - `Authenticated users can create conversations` on `conversations`
   - `Users can add participants to conversations` on `conversation_participants`
   - `Users can view participants of own conversations` on `conversation_participants`

3. Ensure your user is properly authenticated:
   - Check that `auth.uid()` returns a valid user ID
   - Verify the user exists in the `users` table