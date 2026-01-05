-- FINAL COMPREHENSIVE FIX

-- 1. DISABLE AND RE-ENABLE RLS TO RESET STATE
ALTER TABLE public.follows DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- 2. DROP **ALL** POTENTIAL TRIGGERS (Including the old one!)
DROP TRIGGER IF EXISTS trigger_follow_notification ON public.follows;
DROP TRIGGER IF EXISTS on_follow_created ON public.follows;

-- 3. DROP ALL POLICIES
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
DROP POLICY IF EXISTS "Authenticated users can follow others" ON public.follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.follows;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.follows;

-- 4. RE-CREATE POLICIES (Corrected)
CREATE POLICY "Follows are viewable by everyone" 
    ON public.follows FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can follow others" 
    ON public.follows FOR INSERT 
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" 
    ON public.follows FOR DELETE 
    USING (auth.uid() = follower_id);

-- 5. GRANT PERMISSIONS
GRANT ALL ON public.follows TO authenticated;
GRANT SELECT ON public.follows TO anon;

-- 6. RE-CREATE SAFE NOTIFICATION FUNCTION AND TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_follow() 
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Safe insert
  INSERT INTO public.notifications (user_id, type, actor_id)
  VALUES (NEW.following_id, 'follow', NEW.follower_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_follow_created
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_follow();
