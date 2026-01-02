# Authentication Debugging Guide

## Browser Console Commands

Run these commands in your browser's developer console to check authentication status:

```javascript
// Check current session
supabase.auth.getSession().then(({ data, error }) => {
  console.log('Session data:', data);
  console.log('Session error:', error);
});

// Check current user
supabase.auth.getUser().then(({ data, error }) => {
  console.log('User data:', data);
  console.log('User error:', error);
});

// Check if user is authenticated
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state change:', event, session);
});
```

## What to Look For

1. **Session data** should show a valid session with user information
2. **User data** should show the current authenticated user
3. **Auth state change** should show "SIGNED_IN" events

## Common Issues

1. **No session**: User is not logged in
2. **Expired session**: Token needs refresh
3. **Wrong credentials**: Check environment variables

## Environment Variables Check

Ensure your `.env.local` file contains:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Replace with your actual Supabase project credentials.