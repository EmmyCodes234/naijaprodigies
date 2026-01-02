# Storage Quick Setup - Profile Image Upload Fix

## The Problem
Getting this error when uploading profile images:
```
Failed to upload image: new row violates row-level security policy
```

## The Fix (5 minutes)

### 1. Create Storage Bucket
In Supabase Dashboard:
- **Storage** → **New bucket**
- Name: `post-images`
- **Public bucket**: ON ✅
- Click **Create**

### 2. Add 4 Storage Policies
Go to: **Storage** → **post-images** → **Policies**

For each policy below, click **New Policy** → **For full customization**:

#### Policy 1: Public Read
- Name: `Public images are viewable by everyone`
- Operations: ✅ **SELECT**
- Definition: `bucket_id = 'post-images'`

#### Policy 2: Upload
- Name: `Authenticated users can upload images`
- Operations: ✅ **INSERT**
- Definition:
```sql
bucket_id = 'post-images' 
AND auth.role() = 'authenticated'
AND (storage.foldername(name))[1] IN (
  SELECT id::text FROM users WHERE auth_id = auth.uid()
)
```

#### Policy 3: Update
- Name: `Users can update own images`
- Operations: ✅ **UPDATE**
- Definition:
```sql
bucket_id = 'post-images' 
AND (storage.foldername(name))[1] IN (
  SELECT id::text FROM users WHERE auth_id = auth.uid()
)
```

#### Policy 4: Delete
- Name: `Users can delete own images`
- Operations: ✅ **DELETE**
- Definition:
```sql
bucket_id = 'post-images' 
AND (storage.foldername(name))[1] IN (
  SELECT id::text FROM users WHERE auth_id = auth.uid()
)
```

### 3. Test
Try uploading a profile image - it should work now! ✨

---

**Note:** Storage policies can only be created through the Supabase Dashboard UI, not via SQL migrations. This is a Supabase security restriction.

For more details, see [STORAGE_SETUP.md](./STORAGE_SETUP.md)
