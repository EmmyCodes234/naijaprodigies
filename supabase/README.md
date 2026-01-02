# Supabase Setup Instructions

This directory contains the database schema and migration files for the NSP Social Feed feature.

## Prerequisites

1. Create a Supabase account at https://supabase.com
2. Create a new Supabase project

## Setup Steps

### 1. Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in the project details:
   - Name: NSP Social Feed (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Select the closest region to your users
4. Wait for the project to be created (this may take a few minutes)

### 2. Get Your Credentials

1. In your Supabase project dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

### 3. Configure Environment Variables

1. Open the `.env.local` file in the root of your project
2. Replace the placeholder values with your actual Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_actual_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
   ```

### 4. Run Database Migrations

You have two options to run the migrations:

#### Option A: Using Supabase SQL Editor (Recommended for beginners)

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the contents of `migrations/001_initial_schema.sql`
4. Paste into the SQL editor and click "Run"
5. Repeat for each migration file in order:
   - `migrations/002_rls_policies.sql`
   - `migrations/003_auth_integration.sql` (if using authentication)
   - `migrations/004_storage_policies.sql` (if using storage)
   - `migrations/005_direct_messaging.sql` (for direct messaging feature)

#### Option B: Using Supabase CLI (For advanced users)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```
2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
3. Push migrations:
   ```bash
   supabase db push
   ```

### 5. Set Up Storage Bucket (For Image Uploads)

1. In your Supabase project dashboard, go to **Storage**
2. Click "Create a new bucket"
3. Name it `post-images`
4. Set it to **Public** (so images can be accessed via URL)
5. Click "Create bucket"

### 6. Verify Setup

After running the migrations, verify that the following tables exist in your database:
- users
- posts
- post_images
- likes
- comments
- follows
- conversations (if you ran migration 005)
- conversation_participants (if you ran migration 005)
- messages (if you ran migration 005)

You can check this in the **Table Editor** section of your Supabase dashboard.

## Database Schema Overview

### Core Tables

- **users**: User profiles with handle, name, avatar, bio, rank, and verification status
- **posts**: User posts with content (max 280 chars), timestamps, and re-rack support
- **post_images**: Images attached to posts (1-4 per post)
- **likes**: User likes on posts
- **comments**: Comments on posts with threading support
- **follows**: Follow relationships between users

### Direct Messaging Tables (Migration 005)

- **conversations**: Conversation containers between users
- **conversation_participants**: Links users to conversations (many-to-many)
- **messages**: Individual messages within conversations (max 1000 chars)

### Views

- **posts_with_counts**: Aggregated view showing posts with like, comment, and re-rack counts
- **conversations_with_last_message**: Conversations with most recent message info
- **unread_message_counts**: Unread message counts per conversation per user

### Security

All tables have Row Level Security (RLS) enabled with policies that:
- Allow everyone to read public data
- Restrict write operations to authenticated users
- Ensure users can only modify their own content

## Troubleshooting

### "Missing Supabase environment variables" Error

Make sure you've:
1. Created the `.env.local` file in the project root
2. Added the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values
3. Restarted your development server after updating the `.env.local` file

### Migration Errors

If you encounter errors while running migrations:
1. Check that you're running them in order (001 before 002)
2. Ensure the UUID extension is enabled
3. Check the Supabase logs for detailed error messages

### RLS Policy Issues

If you're having trouble with data access:
1. Verify that RLS is enabled on all tables
2. Check that policies are created correctly
3. Ensure you're authenticated when performing write operations

## Next Steps

After completing the setup:
1. Test the connection by running the development server: `npm run dev`
2. Proceed to implement the service layer (postService, userService, etc.)
3. Start building the UI components that interact with Supabase
