-- 1. Create the push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- 2. Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Allow users to insert their own subscriptions
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert their own subscriptions" 
    ON public.push_subscriptions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view their own subscriptions" 
    ON public.push_subscriptions FOR SELECT 
    USING (auth.uid() = user_id);

-- Allow users to delete their own subscriptions
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete their own subscriptions" 
    ON public.push_subscriptions FOR DELETE 
    USING (auth.uid() = user_id);

-- 4. Enable pg_net extension for HTTP requests (if using SQL trigger approach)
-- Note: This is required if you want the DB to call the Edge Function directly via Trigger.
-- If you use the Dashboard Webhooks UI, you can skip this extension and the prompt below.
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 5. Note on Trigger
-- To create the trigger via SQL, you need the Project URL and Service Key.
-- Since we are running this in a generic editor, please replace the placeholders below
-- OR set up the Webhook individually in the Dashboard UI (Recommended).

/* 
-- UNCOMMENT AND CONFIGURE TO USE SQL TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_notification()
RETURNS TRIGGER AS $$
DECLARE
  -- REPLACE THESE VALUES
  project_url TEXT := 'https://YOUR_PROJECT_ID.supabase.co'; 
  service_role_key TEXT := 'YOUR_SERVICE_ROLE_KEY';
  
  function_url TEXT := project_url || '/functions/v1/push-notification';
BEGIN
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'record', row_to_json(NEW)
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_notification();
*/
