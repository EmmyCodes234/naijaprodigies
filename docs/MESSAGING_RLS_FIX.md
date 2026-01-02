# Messaging RLS Infinite Recursion Fix

## Problem

The original RLS policies for the `conversation_participants` table caused infinite recursion errors:

```
Error: infinite recursion detected in policy for relation "conversation_participants"
```

### Root Cause

The SELECT and INSERT policies on `conversation_participants` were querying the same table they were protecting:

```sql
-- PROBLEMATIC POLICY
CREATE POLICY "Users can view participants of own conversations"
  ON conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp  -- ❌ Queries same table!
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );
```

When Postgres evaluates this policy, it needs to check `conversation_participants` to determine if the user can view `conversation_participants`, creating a circular dependency.

## Solution

We fixed this with two changes:

### 1. Helper Function for Participant Checks

We created a helper function with `SECURITY DEFINER` that bypasses RLS:

```sql
CREATE OR REPLACE FUNCTION is_conversation_participant(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER  -- ✅ Bypasses RLS to prevent recursion
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM conversation_participants 
    WHERE conversation_id = p_conversation_id 
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql;
```

Then we use this function in the policies:

```sql
CREATE POLICY "Users can view participants of own conversations"
  ON conversation_participants FOR SELECT
  USING (
    is_conversation_participant(conversation_id, auth.uid())  -- ✅ No recursion!
  );
```

### 2. Simplified Conversations INSERT Policy

The original INSERT policy on `conversations` was also causing issues. We simplified it:

```sql
-- OLD (too restrictive)
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- NEW (properly permissive)
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

This is safe because:
- Users can only see conversations they participate in (SELECT policy)
- The conversation itself has no sensitive data
- Security is enforced at the participant and message level

## How SECURITY DEFINER Prevents Recursion

- `SECURITY DEFINER` makes the function execute with the privileges of the function owner (typically a superuser)
- This allows the function to bypass RLS policies when querying `conversation_participants`
- The policy check completes without triggering another policy evaluation
- Security is maintained because the function only checks participation, not data access

## Migration File

The fix is in: `supabase/migrations/007_fix_messaging_rls.sql`

## Applying the Fix

### Option A: Using Supabase CLI
```bash
supabase db push
```

### Option B: Using Supabase Dashboard
1. Go to SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase/migrations/007_fix_messaging_rls.sql`
3. Execute the SQL

### Verify the Fix

After applying the migration, test the message button:

1. Visit another user's profile
2. Click the "Message" button
3. Verify you're redirected to the messages page
4. Verify a conversation is created or opened
5. No infinite recursion error should occur

## Related Issues

This same pattern can occur with any self-referencing RLS policy. Always use `SECURITY DEFINER` helper functions when:

- A policy needs to query the same table it's protecting
- A policy needs to check relationships that might create circular dependencies
- Complex authorization logic requires multiple table lookups

## Security Considerations

The `is_conversation_participant` function is safe because:

1. It only checks participation (boolean result)
2. It doesn't return sensitive data
3. It's used within RLS policies that still enforce access control
4. The function itself is simple and auditable

## Testing

Test the following scenarios after applying the fix:

1. ✅ User can view their own participant records
2. ✅ User can view other participants in their conversations
3. ✅ User can add themselves to a new conversation
4. ✅ User can add others to conversations they're in
5. ✅ User cannot view participants of conversations they're not in
6. ✅ User cannot add participants to conversations they're not in

