# Quick Start - 5 Minutes to Supabase

The fastest way to get Supabase running for NSP Social Feed.

## 1. Create Project (2 min)

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - Name: `NSP Social Feed`
   - Password: (create strong password)
   - Region: `Europe West (London)` or closest
4. Click "Create new project"
5. ☕ Wait 2 minutes for setup

## 2. Get Credentials (30 sec)

1. Click **Settings** (gear icon) → **API**
2. Copy these two values:

```
Project URL: https://xxxxx.supabase.co
anon key: eyJhbGc...
```

## 3. Configure App (30 sec)

Open `.env.local` and paste:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

## 4. Create Database (1 min)

1. In Supabase, click **SQL Editor** → **New query**
2. Copy/paste from `migrations/001_initial_schema.sql`
3. Click **Run** ▶️
4. Click **New query** again
5. Copy/paste from `migrations/002_rls_policies.sql`
6. Click **Run** ▶️

## 5. Create Storage (1 min)

1. Click **Storage** → **Create a new bucket**
2. Name: `post-images`
3. Toggle **Public bucket** ON
4. Click **Create bucket**

## ✅ Done!

Restart your dev server:
```bash
npm run dev
```

Your app is now connected to Supabase!

## Verify It Works

1. Open browser console (F12)
2. No Supabase errors = ✅ Success!

## What's Next?

- [ ] Task 2: Implement Row Level Security policies (already done!)
- [ ] Task 3: Create service layer structure
- [ ] Task 4: Implement post creation functionality

## Need More Details?

- Full guide: `SUPABASE_SETUP.md`
- Checklist: `SETUP_CHECKLIST.md`
- Schema reference: `DATABASE_REFERENCE.md`
