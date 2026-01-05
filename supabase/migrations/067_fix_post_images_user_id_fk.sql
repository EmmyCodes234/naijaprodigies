-- Fix post_images.user_id foreign key
-- The column was incorrectly referencing auth.users(id) but the app uses public.users.id

-- 1. Drop the wrong foreign key constraint
ALTER TABLE post_images DROP CONSTRAINT IF EXISTS post_images_user_id_fkey;

-- 2. Add the correct foreign key constraint referencing public.users
ALTER TABLE post_images 
ADD CONSTRAINT post_images_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
