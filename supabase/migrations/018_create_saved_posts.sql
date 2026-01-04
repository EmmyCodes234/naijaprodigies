-- Create saved_posts table
create table if not exists public.saved_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, post_id)
);

-- Enable RLS
alter table public.saved_posts enable row level security;

-- Policies

-- Users can view their own saved posts
create policy "Users can view their own saved posts"
  on public.saved_posts for select
  using (auth.uid() = user_id);

-- Users can save posts
create policy "Users can save posts"
  on public.saved_posts for insert
  with check (auth.uid() = user_id);

-- Users can unsave posts
create policy "Users can unsave posts"
  on public.saved_posts for delete
  using (auth.uid() = user_id);

-- Create index for performance
create index if not exists saved_posts_user_id_idx on public.saved_posts(user_id);
create index if not exists saved_posts_post_id_idx on public.saved_posts(post_id);

-- Add updated_at trigger? No need for saved_posts usually.
