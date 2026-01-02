# Deploying the Push Notification Backend

To complete the loop and start sending actual push notifications, follow these steps:

## 1. Deploy the Edge Function
You need to deploy the function located in `supabase/functions/push-notification`.

Prerequisites:
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`npm install -g supabase`).
- Logged in via CLI (`supabase login`).

Run:
```bash
supabase functions deploy push-notification
```

## 2. Set Environment Variables
The Edge Function needs your Supabase keys and VAPID keys to work.

Run:
```bash
supabase secrets set --env-file .env
```
*Make sure your .env file contains:*
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (Find this in your Supabase Dashboard > Settings > API)
- `VAPID_PUBLIC_KEY` (The one we generated)
- `VAPID_PRIVATE_KEY` (The private one we generated)

## 3. Set Up the Database Trigger
You can execute the SQL in `supabase/migrations/011_push_webhook_trigger.sql` via the Supabase Dashboard SQL Editor.

**Important:**
- Replace `YOUR_SUPABASE_PROJECT_URL` with your actual project URL.
- Replace `YOUR_SERVICE_ROLE_KEY` with your actual Service Role Key (be careful exposing this in raw SQL if you are not sure; using the `vault` is better, or just rely on a restricted user).
- AND/OR: Consider using the Supabase Dashboard "Database Webhooks" UI to point to your new Edge Function URL instead of raw SQL triggers, which is safer and easier.
    - Go to Database > Webhooks.
    - Create a new webhook "on_notification_created".
    - Event: INSERT on table `notifications`.
    - Type: HTTP Request.
    - URL: `https://[your-project-ref].supabase.co/functions/v1/push-notification`.
    - Headers: `Authorization: Bearer [YOUR_ANON_OR_SERVICE_KEY]`.
