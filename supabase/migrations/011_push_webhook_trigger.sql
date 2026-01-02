-- Enable the pg_net extension if not already enabled (required for http requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a trigger function that calls the Edge Function
CREATE OR REPLACE FUNCTION public.handle_new_notification()
RETURNS TRIGGER AS $$
DECLARE
  project_url TEXT := 'YOUR_SUPABASE_PROJECT_URL'; -- You need to replace this or use a secret if possible in SQL (harder)
  service_role_key TEXT := 'YOUR_SERVICE_ROLE_KEY'; -- VERY SECURE!!! In a real app involving triggers, use vault or hardcode if local. Be careful.
  -- For local dev or simple setup where we just want the SQL:
  
  -- Function URL
  function_url TEXT := project_url || '/functions/v1/push-notification';
BEGIN
  -- We can use pg_net to make an async HTTP request
  -- Note: pg_net.http_post returns a request_id, we discard it with PERFORM
  
  -- Alternatively, Supabase has native Webhooks via the Dashboard which is safer/easier.
  -- But to do it via SQL:
  
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

-- Create the Trigger
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_notification();
