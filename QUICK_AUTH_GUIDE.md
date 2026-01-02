# Quick Authentication Guide

## 🚀 Get Started in 3 Steps

### 1. Run the Database Migration
Open Supabase SQL Editor and run:
```sql
-- Copy and paste contents of supabase/migrations/003_auth_integration.sql
```

### 2. Start the App
```bash
npm run dev
```

### 3. Test Authentication
- Click "Sign In" button in navbar
- Toggle to "Sign Up"
- Create an account with:
  - Email: test@example.com
  - Password: password123
  - Handle: @testuser
  - Name: Test User

## 🎯 Common Use Cases

### Check if User is Logged In
```tsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user } = useAuth();
  
  return user ? <p>Logged in!</p> : <p>Not logged in</p>;
}
```

### Get Current User Profile
```tsx
import { useCurrentUser } from './hooks/useCurrentUser';

function MyComponent() {
  const { profile, loading } = useCurrentUser();
  
  if (loading) return <div>Loading...</div>;
  
  return <div>Hello, {profile?.name}!</div>;
}
```

### Protect a Route
```tsx
import ProtectedRoute from './components/Auth/ProtectedRoute';

<Route path="/protected" element={
  <ProtectedRoute>
    <MyProtectedPage />
  </ProtectedRoute>
} />
```

### Sign Out
```tsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { signOut } = useAuth();
  
  return <button onClick={signOut}>Sign Out</button>;
}
```

## 🔒 What's Protected?

Currently protected routes:
- `/feed` - Social Feed (requires authentication)

Public routes:
- `/` - Home
- `/story` - Our Story
- `/tournaments` - Tournaments
- `/blog` - Blog
- `/members` - Members

## 📝 Database Schema

When a user signs up:
1. Supabase Auth creates an auth user
2. Database trigger automatically creates a profile in `users` table
3. Profile includes: `auth_id`, `handle`, `name`, `avatar`

## 🛡️ Security

- All tables have Row Level Security (RLS) enabled
- Users can only modify their own content
- Authentication required for creating posts, likes, comments
- Sessions are stored securely in browser

## 🐛 Troubleshooting

### "Missing Supabase environment variables"
Check `.env.local` has:
```env
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
```

### "relation 'users' does not exist"
Run the database migrations in order:
1. `001_initial_schema.sql`
2. `002_rls_policies.sql`
3. `003_auth_integration.sql`

### Can't access protected routes
Make sure you're signed in. Check browser console for auth errors.

### Sign up not working
1. Check Supabase dashboard > Authentication > Settings
2. Verify email provider is enabled
3. Check browser console for specific error

## 📚 More Documentation

- `AUTH_SETUP.md` - Detailed authentication documentation
- `AUTHENTICATION_IMPLEMENTATION.md` - Implementation details
- `docs/AUTH_FLOW.md` - Visual flow diagrams
- `SUPABASE_SETUP.md` - Database setup guide

## 💡 Tips

- Sessions persist across page refreshes
- Sign out is instant and clears all auth state
- Protected routes automatically redirect to home if not authenticated
- Auth state is available globally via `useAuth()` hook
