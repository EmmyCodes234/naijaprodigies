# NSP Social Feed - Supabase Setup Guide

This guide will walk you through setting up Supabase for the NSP Social Feed feature.

## Quick Start

### Step 1: Create Supabase Project

1. Visit [https://supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: NSP Social Feed
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to Nigeria (e.g., eu-west-1 or eu-central-1)
4. Click **"Create new project"** and wait 2-3 minutes

### Step 2: Get Your API Credentials

1. In your project dashboard, click **Settings** (gear icon in sidebar)
2. Click **API** in the settings menu
3. You'll see two important values:
   - **Project URL**: Something like `https://xxxxx.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`

### Step 3: Configure Your Application

1. Open `.env.local` in the project root
2. Replace the placeholder values:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...your-actual-key
   ```
3. Save the file

### Step 4: Create Database Tables

1. In Supabase dashboard, click **SQL Editor** in the sidebar
2. Click **"New query"**
3. Open `supabase/migrations/001_initial_schema.sql` from this project
4. Copy all the SQL code and paste it into the Supabase SQL editor
5. Click **"Run"** (or press Ctrl+Enter)
6. Wait for success message: "Success. No rows returned"

7. Click **"New query"** again
8. Open `supabase/migrations/002_rls_policies.sql`
9. Copy all the SQL code and paste it into the editor
10. Click **"Run"**
11. Wait for success message

12. Click **"New query"** again
13. Open `supabase/migrations/003_auth_integration.sql`
14. Copy all the SQL code and paste it into the editor
15. Click **"Run"**
16. Wait for success message

### Step 5: Create Storage Bucket for Images

1. In Supabase dashboard, click **Storage** in the sidebar
2. Click **"Create a new bucket"**
3. Enter bucket name: `post-images`
4. Toggle **"Public bucket"** to ON (images need to be publicly accessible)
5. Click **"Create bucket"**

### Step 6: Configure Storage Policies

1. Click on the `post-images` bucket you just created
2. Click **"Policies"** tab
3. Click **"New policy"**
4. Select **"For full customization"**
5. Create a policy for uploads:
   - **Policy name**: "Allow authenticated uploads"
   - **Policy definition**: SELECT, INSERT
   - **Target roles**: authenticated
   - **USING expression**: `true`
   - **WITH CHECK expression**: `true`
6. Click **"Review"** then **"Save policy"**

7. Create another policy for public reads:
   - **Policy name**: "Allow public reads"
   - **Policy definition**: SELECT
   - **Target roles**: public
   - **USING expression**: `true`
8. Click **"Review"** then **"Save policy"**

### Step 7: Verify Setup

1. In Supabase dashboard, click **Table Editor**
2. You should see these tables:
   - ✓ users
   - ✓ posts
   - ✓ post_images
   - ✓ likes
   - ✓ comments
   - ✓ follows

3. Click **Database** > **Views** and verify:
   - ✓ posts_with_counts

### Step 8: Test the Connection

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Open browser console (F12)
3. The app should start without Supabase errors

## What Was Created?

### Database Tables

| Table | Purpose |
|-------|---------|
| **users** | User profiles (handle, name, avatar, bio, rank, verified status) |
| **posts** | User posts with 280 char limit, timestamps, re-rack support |
| **post_images** | Images attached to posts (1-4 per post) |
| **likes** | User likes on posts |
| **comments** | Comments on posts with threading support |
| **follows** | Follow relationships between users |

### Security Features

- ✓ Row Level Security (RLS) enabled on all tables
- ✓ Users can only edit/delete their own content
- ✓ Everyone can read public data
- ✓ Authenticated users can create content
- ✓ Cascade deletes handle data cleanup

### Performance Optimizations

- ✓ Indexes on frequently queried columns
- ✓ View for aggregated post counts
- ✓ Automatic timestamp updates

## Troubleshooting

### Error: "Missing Supabase environment variables"

**Solution**: 
1. Check `.env.local` exists in project root
2. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. Restart dev server: Stop (Ctrl+C) and run `npm run dev` again

### Error: "relation 'users' does not exist"

**Solution**: You haven't run the migrations yet
1. Go to Supabase SQL Editor
2. Run `001_initial_schema.sql` first
3. Then run `002_rls_policies.sql`

### Error: "new row violates row-level security policy"

**Solution**: RLS policies are blocking the operation
1. Check you're authenticated (for write operations)
2. Verify policies were created correctly
3. Check the specific policy for the table in question

### Images won't upload

**Solution**: Storage bucket not configured
1. Verify `post-images` bucket exists
2. Check bucket is set to **Public**
3. Verify storage policies allow uploads

### Step 9: Configure Authentication (Optional but Recommended)

1. In Supabase dashboard, click **Authentication** in the sidebar
2. Click **Settings** tab
3. Configure email settings:
   - Enable **Email** provider (should be on by default)
   - Customize email templates if desired
4. For production, configure SMTP settings for reliable email delivery

See `AUTH_SETUP.md` for detailed authentication documentation.

## Next Steps

Now that Supabase is set up, you can:

1. ✓ Start implementing service layer functions (postService, userService, etc.)
2. ✓ Connect React components to Supabase
3. ✓ Test real-time features
4. ✓ Authentication is now implemented! See `AUTH_SETUP.md`

## Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord Community](https://discord.supabase.com)
- Check `supabase/README.md` for more detailed information
