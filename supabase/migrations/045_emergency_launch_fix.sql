-- EMERGENCY LAUNCH FIX
-- Bypasses all RLS/Permissions to ensure the user profile exists

CREATE OR REPLACE FUNCTION public.ensure_user_profile(
    p_id UUID,
    p_name TEXT,
    p_handle TEXT,
    p_avatar TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- RUNS AS SUPERUSER (Bypasses RLS)
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, name, handle, avatar)
    VALUES (p_id, p_name, p_handle, p_avatar)
    ON CONFLICT (id) DO NOTHING; -- If exists, do nothing
END;
$$;

-- Grant functionality to everyone
GRANT EXECUTE ON FUNCTION public.ensure_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile TO anon;
