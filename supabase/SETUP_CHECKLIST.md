# Supabase Setup Checklist

Use this checklist to verify your Supabase setup is complete and correct.

## ✅ Pre-Setup

- [ ] Supabase account created at https://supabase.com
- [ ] New project created in Supabase dashboard
- [ ] Project is fully initialized (no longer shows "Setting up project...")

## ✅ Credentials Configuration

- [ ] Copied Project URL from Supabase Settings > API
- [ ] Copied anon/public key from Supabase Settings > API
- [ ] Updated `.env.local` with `VITE_SUPABASE_URL`
- [ ] Updated `.env.local` with `VITE_SUPABASE_ANON_KEY`
- [ ] Restarted development server after updating `.env.local`

## ✅ Database Schema

- [ ] Ran `001_initial_schema.sql` in Supabase SQL Editor
- [ ] Saw "Success. No rows returned" message
- [ ] Ran `002_rls_policies.sql` in Supabase SQL Editor
- [ ] Saw "Success. No rows returned" message
- [ ] Ran `003_auth_integration.sql` in Supabase SQL Editor (if using authentication)
- [ ] Ran `004_storage_policies.sql` in Supabase SQL Editor (if using storage)
- [ ] Ran `005_direct_messaging.sql` in Supabase SQL Editor (for direct messaging feature)
- [ ] Saw "Success. No rows returned" message for all migrations

## ✅ Tables Created

Verify in Supabase Dashboard > Table Editor:

- [ ] `users` table exists
- [ ] `posts` table exists
- [ ] `post_images` table exists
- [ ] `likes` table exists
- [ ] `comments` table exists
- [ ] `follows` table exists
- [ ] `conversations` table exists (for direct messaging)
- [ ] `conversation_participants` table exists (for direct messaging)
- [ ] `messages` table exists (for direct messaging)

## ✅ Views Created

Verify in Supabase Dashboard > Database > Views:

- [ ] `posts_with_counts` view exists
- [ ] `conversations_with_last_message` view exists (for direct messaging)
- [ ] `unread_message_counts` view exists (for direct messaging)

## ✅ Row Level Security

Verify in Supabase Dashboard > Authentication > Policies:

- [ ] `users` table has RLS enabled with 2 policies
- [ ] `posts` table has RLS enabled with 4 policies
- [ ] `post_images` table has RLS enabled with 3 policies
- [ ] `likes` table has RLS enabled with 3 policies
- [ ] `comments` table has RLS enabled with 3 policies
- [ ] `follows` table has RLS enabled with 3 policies
- [ ] `conversations` table has RLS enabled with 3 policies (for direct messaging)
- [ ] `conversation_participants` table has RLS enabled with 4 policies (for direct messaging)
- [ ] `messages` table has RLS enabled with 4 policies (for direct messaging)

## ✅ Storage Setup

- [ ] Created `post-images` bucket in Supabase Storage
- [ ] Set bucket to **Public**
- [ ] Added storage policy for authenticated uploads
- [ ] Added storage policy for public reads

## ✅ Application Configuration

- [ ] `@supabase/supabase-js` package installed
- [ ] `services/supabaseClient.ts` file exists
- [ ] `types.ts` updated with database models
- [ ] No TypeScript errors in `services/supabaseClient.ts`

## ✅ Verification Tests

- [ ] Development server starts without Supabase errors
- [ ] No "Missing Supabase environment variables" error
- [ ] Can access Supabase dashboard and see all tables

## 🎉 Setup Complete!

If all items are checked, your Supabase setup is complete and you're ready to:

1. Implement service layer functions (Task 3)
2. Set up Row Level Security policies (Task 2)
3. Start building the social feed features

## ❌ Troubleshooting

If any items are not checked, refer to:
- `SUPABASE_SETUP.md` - Detailed setup instructions
- `supabase/README.md` - Technical documentation
- `supabase/DATABASE_REFERENCE.md` - Schema reference

### Common Issues

**Can't find Project URL or API key**
→ Go to Supabase Dashboard > Settings > API

**SQL migration fails**
→ Make sure to run `001_initial_schema.sql` before `002_rls_policies.sql`

**Environment variables not working**
→ Restart your dev server after updating `.env.local`

**Tables not showing up**
→ Check SQL Editor for error messages when running migrations
