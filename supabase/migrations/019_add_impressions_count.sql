-- Add impressions_count to posts table
alter table public.posts 
add column if not exists impressions_count bigint default 0 not null;

-- Create RPC function to safely increment impressions
create or replace function increment_impressions(row_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.posts
  set impressions_count = impressions_count + 1
  where id = row_id;
end;
$$;
