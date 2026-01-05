-- EMERGENCY KILL SWITCH
-- Run this to stop the "Out of memory" errors immediately.

DROP TRIGGER IF EXISTS trigger_comment_notification ON comments;
