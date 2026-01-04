-- Enable Realtime for notifications table
begin;
  -- Remove if already exists to avoid errors (though usually 'add table' is idempotent-ish or throws if exists)
  -- But safer to just run the alter command. If it fails due to existing, we can catch or ignore.
  -- Actually, standard way:
  alter publication supabase_realtime add table notifications;
commit;
