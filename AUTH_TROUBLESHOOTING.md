# Authentication Troubleshooting Guide

## Problem
Database queries are failing with "403 Forbidden" errors because `auth.uid()` returns `null` in SQL queries, indicating the database session isn't authenticated.

## Root Causes
1. Frontend is authenticated but database session isn't
2. Session token isn't being passed to database requests
3. Authentication context isn't properly maintained between frontend and backend

## Solutions

### 1. Verify Frontend Authentication
Check browser console for:
```
AuthContext: Initial session loaded: {session object}
AuthContext: Auth state changed: SIGNED_IN {session object}
```

If these don't appear, the user isn't properly signed in.

### 2. Force Session Refresh
Add this to your authentication flow:
```javascript
// Force refresh the session
const { data, error } = await supabase.auth.refreshSession();
if (error) console.error('Session refresh failed:', error);
```

### 3. Check Environment Variables
Ensure `.env.local` contains correct values:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Verify Supabase Client Configuration
The client should be configured with:
```javascript
createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true
  }
})
```

### 5. Test Database Authentication
Run in browser console:
```javascript
// This should show a user ID if properly authenticated
supabase.rpc('auth.uid').then(console.log);

// Or test with a simple query
supabase.from('users').select('id').limit(1).then(({ data, error }) => {
  if (error && error.code === '401') {
    console.log('Authentication required');
  }
});
```

## Quick Fix
If all else fails, temporarily disable RLS for testing:
```sql
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
```

Remember to re-enable after testing:
```sql
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
```