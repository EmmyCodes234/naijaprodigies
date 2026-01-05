-- COMPREHENSIVE FIX FOR FOLLOWS AND NOTIFICATIONS

-- 1. FIX RLS ON FOLLOWS (ENSURE THIS IS APPLIED)
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
DROP POLICY IF EXISTS "Authenticated users can follow others" ON public.follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;

CREATE POLICY "Follows are viewable by everyone" 
    ON public.follows FOR SELECT 
    USING (true);

-- Ensure "follower_id" matches auth.uid()
CREATE POLICY "Authenticated users can follow others" 
    ON public.follows FOR INSERT 
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" 
    ON public.follows FOR DELETE 
    USING (auth.uid() = follower_id);

GRANT ALL ON public.follows TO authenticated;
GRANT SELECT ON public.follows TO anon;


-- 2. FIX NOTIFICATION TRIGGER FOR FOLLOWS
-- The trigger function must be SECURITY DEFINER to bypass RLS on the 'notifications' table
-- because normal users usually cannot INSERT into 'notifications' directly for other people.

CREATE OR REPLACE FUNCTION public.handle_new_follow() 
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, actor_id)
  VALUES (NEW.following_id, 'follow', NEW.follower_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger to be safe
DROP TRIGGER IF EXISTS on_follow_created ON public.follows;
CREATE TRIGGER on_follow_created
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_follow();

