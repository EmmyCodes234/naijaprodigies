-- Add media columns to comments table
alter table public.comments
add column if not exists media_url text,
add column if not exists media_type text check (media_type in ('image', 'video', 'gif'));

-- No RLS changes needed as existing policies cover row access
