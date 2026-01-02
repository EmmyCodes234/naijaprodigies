# Storage Setup Guide

## Issue
When trying to upload images (e.g., profile avatars), you may encounter this error:
```
Failed to upload image: new row violates row-level security policy
```

This happens because the Supabase Storage bucket needs Row Level Security (RLS) policies configured.

## Solution

### Step 1: Create the Storage Bucket

First, create the storage bucket:

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Enter bucket name: `post-images`
5. Set **Public bucket** to **ON** (enabled)
6. Click **Create bucket**

**Alternative:** Run the SQL migration to create the bucket:
- Go to **SQL Editor** > **New Query**
- Copy and paste the contents of `supabase/migrations/004_storage_policies.sql`
- Click **Run**

### Step 2: Set Up Storage Policies

Storage policies must be created through the Supabase Dashboard UI:

1. Go to **Storage** in your Supabase dashboard
2. Click on the **post-images** bucket
3. Click on the **Policies** tab
4. Click **New Policy**

Create these 4 policies:

#### Policy 1: Public Read Access
- Click **New Policy** > **For full customization**
- Policy Name: `Public images are viewable by everyone`
- Allowed Operations: Check **SELECT**
- Policy Definition:
  ```sql
  bucket_id = 'post-images'
  ```
- Click **Review** > **Save policy**

#### Policy 2: Authenticated Upload
- Click **New Policy** > **For full customization**
- Policy Name: `Authenticated users can upload images`
- Allowed Operations: Check **INSERT**
- Policy Definition:
  ```sql
  bucket_id = 'post-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM users WHERE auth_id = auth.uid()
  )
  ```
- Click **Review** > **Save policy**

#### Policy 3: Update Own Images
- Click **New Policy** > **For full customization**
- Policy Name: `Users can update own images`
- Allowed Operations: Check **UPDATE**
- Policy Definition:
  ```sql
  bucket_id = 'post-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM users WHERE auth_id = auth.uid()
  )
  ```
- Click **Review** > **Save policy**

#### Policy 4: Delete Own Images
- Click **New Policy** > **For full customization**
- Policy Name: `Users can delete own images`
- Allowed Operations: Check **DELETE**
- Policy Definition:
  ```sql
  bucket_id = 'post-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM users WHERE auth_id = auth.uid()
  )
  ```
- Click **Review** > **Save policy**

### Step 3: Verify Setup

After creating all policies:

1. Go to **Storage** > **post-images** > **Policies**
2. You should see 4 policies listed
3. Each policy should show as **Enabled**

### Step 4: Test Image Upload

Try uploading a profile image again. The upload should now work correctly.

## What the Migration Does

The migration:

1. **Creates the `post-images` bucket** - A public storage bucket for all post and profile images
2. **Enables RLS on storage.objects** - Ensures security policies are enforced
3. **Sets up 4 storage policies**:
   - **SELECT**: Anyone can view images (public bucket)
   - **INSERT**: Authenticated users can upload images to their own folder
   - **UPDATE**: Users can update their own images
   - **DELETE**: Users can delete their own images

## Storage Structure

Images are organized by user ID:
```
post-images/
  ├── {user-id-1}/
  │   ├── {timestamp}-{random}.jpg
  │   └── {timestamp}-{random}.png
  ├── {user-id-2}/
  │   └── {timestamp}-{random}.jpg
  └── ...
```

This structure ensures:
- Each user has their own folder
- RLS policies can verify ownership based on folder name
- Images are uniquely named to prevent conflicts

## Troubleshooting

### Error: "must be owner of table objects"
This error occurs when trying to run storage policy SQL directly. Storage policies **must** be created through the Supabase Dashboard UI, not via SQL migrations. Follow Step 2 above to create policies through the dashboard.

### Error: "Bucket already exists"
If you see this error when creating the bucket, it means the bucket was already created. Skip to Step 2 to set up the policies.

### Error: "Policy already exists"
If a policy already exists with the same name, you can either:
1. Delete the existing policy and recreate it
2. Edit the existing policy to match the definition above

To delete a policy:
1. Go to **Storage** > **post-images** > **Policies**
2. Find the policy you want to delete
3. Click the **...** menu > **Delete policy**

### Still Getting RLS Errors?

1. Verify you're authenticated (logged in)
2. Check that your user profile exists in the `users` table
3. Verify the `auth_id` column in your user profile matches your auth user ID
4. Check the Supabase logs for more detailed error messages

## Security Notes

- The bucket is **public** for reading, meaning anyone can view images via their URLs
- Only authenticated users can upload images
- Users can only upload to folders matching their user profile ID
- Users can only modify/delete their own images
- The RLS policies link the auth user ID to the profile user ID through the `users` table

## Next Steps

After setting up storage, you can:
- Upload profile avatars
- Upload post images (up to 4 per post)
- All images will be securely stored and properly access-controlled
