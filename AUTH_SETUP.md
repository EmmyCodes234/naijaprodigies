# Authentication Setup

This application now has proper authentication implemented using Supabase Auth.

## Features

- **Email/Password Authentication**: Users can sign up and sign in with email and password
- **Protected Routes**: The Social Feed is now protected and requires authentication
- **User Profiles**: Automatic profile creation on signup with handle and name
- **Session Management**: Persistent sessions across page reloads
- **Row Level Security**: Database policies ensure users can only modify their own content

## Components

### AuthContext (`contexts/AuthContext.tsx`)
Provides authentication state and methods throughout the app:
- `user`: Current authenticated user
- `session`: Current session
- `loading`: Loading state
- `signUp()`: Create new account
- `signIn()`: Sign in with credentials
- `signOut()`: Sign out current user

### AuthModal (`components/Auth/AuthModal.tsx`)
Modal component for sign in/sign up with:
- Email and password fields
- Handle and name fields for signup
- Toggle between sign in and sign up modes
- Error handling and loading states

### ProtectedRoute (`components/Auth/ProtectedRoute.tsx`)
Wrapper component that redirects unauthenticated users to home page.

## Database Changes

### Migration: `003_auth_integration.sql`
- Adds `auth_id` column to users table linking to Supabase auth
- Creates trigger to automatically create user profile on signup
- Updates all RLS policies to use `auth_id` instead of direct user ID checks
- Ensures proper security for all user actions

## Usage

### In Components
```tsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, signOut } = useAuth();
  
  return (
    <div>
      {user ? (
        <button onClick={signOut}>Sign Out</button>
      ) : (
        <p>Please sign in</p>
      )}
    </div>
  );
}
```

### Get Current User Profile
```tsx
import { useCurrentUser } from '../hooks/useCurrentUser';

function MyComponent() {
  const { profile, loading, error } = useCurrentUser();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>Welcome, {profile?.name}!</div>;
}
```

### Protect a Route
```tsx
<Route path="/protected" element={
  <ProtectedRoute>
    <ProtectedPage />
  </ProtectedRoute>
} />
```

## Setup Instructions

1. **Run the migration**: Apply `003_auth_integration.sql` to your Supabase database
2. **Configure email settings**: In Supabase dashboard, configure email templates and SMTP settings
3. **Test authentication**: Try signing up with a new account

## Security

- All database tables have Row Level Security (RLS) enabled
- Users can only create/update/delete their own content
- Authentication state is managed securely by Supabase
- Passwords are never stored in plain text

## Next Steps

- Add password reset functionality
- Add email verification
- Add OAuth providers (Google, GitHub, etc.)
- Add profile editing UI
- Add user avatar upload
