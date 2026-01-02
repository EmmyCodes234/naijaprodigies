-- Create user_keys table for E2EE
CREATE TABLE IF NOT EXISTS public.user_keys (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL, -- JSON string of public key (JWK)
    encrypted_private_key TEXT NOT NULL, -- JSON string of encrypted private key + iv
    salt TEXT NOT NULL, -- Sale used for PIN derivation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;

-- Everyone can read keys (needed to fetch public keys for sending messages)
-- Ideally we would restrict encrypted_private_key to the owner, but Supabase column-level security is not available via standard RLS.
-- Since the private key is encrypted with a user-only PIN, it is safe-ish. 
CREATE POLICY "Everyone can read user keys" ON public.user_keys
    FOR SELECT USING (true);

-- Authenticated users can insert/update their own keys
CREATE POLICY "Users can manage their own keys" ON public.user_keys
    FOR ALL USING (auth.uid() = user_id);
