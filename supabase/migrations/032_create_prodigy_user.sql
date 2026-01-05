-- Create Prodigy AI User
INSERT INTO public.users (id, handle, name, avatar, bio, rank, verified, verification_type)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'Prodigy',
  'Prodigy AI',
  'https://api.iconify.design/ph:sparkle-fill.svg?color=%2300ba7c', -- Placeholder AI Avatar
  'The official AI assistant of NSP. Powered by Llama 3.1 70b.',
  'AI',
  true,
  'gold'
) ON CONFLICT (id) DO NOTHING;

-- Also update existing if it exists differently?
UPDATE public.users 
SET 
    name = 'Prodigy AI',
    verified = true,
    verification_type = 'gold',
    avatar = 'https://api.iconify.design/ph:sparkle-fill.svg?color=%2300ba7c'
WHERE id = 'd0000000-0000-0000-0000-000000000001';
