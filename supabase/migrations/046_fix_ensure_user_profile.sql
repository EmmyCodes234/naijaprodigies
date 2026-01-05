-- Fix ensure_user_profile to correctly set auth_id
-- This ensures that restored profiles work with RLS policies

CREATE OR REPLACE FUNCTION public.ensure_user_profile(
    p_id UUID,
    p_name TEXT,
    p_handle TEXT,
    p_avatar TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auth_id UUID;
BEGIN
    -- Get current auth user ID
    v_auth_id := auth.uid();

    -- Insert with auth_id
    INSERT INTO public.users (id, auth_id, name, handle, avatar)
    VALUES (p_id, v_auth_id, p_name, p_handle, p_avatar)
    ON CONFLICT (id) DO UPDATE SET
        auth_id = EXCLUDED.auth_id; -- Ensure link is restored
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile TO anon;
