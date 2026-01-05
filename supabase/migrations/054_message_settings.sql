-- Message Settings Schema
-- Stores user preferences for messaging privacy and features

-- Add message settings columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS message_request_setting TEXT DEFAULT 'everyone' 
    CHECK (message_request_setting IN ('no_one', 'verified', 'everyone')),
ADD COLUMN IF NOT EXISTS allow_subscriber_messages BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS filter_low_quality_messages BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS enable_debug_logs BOOLEAN DEFAULT FALSE;

-- Comment on columns for documentation
COMMENT ON COLUMN public.users.message_request_setting IS 'Who can send message requests: no_one, verified, everyone';
COMMENT ON COLUMN public.users.allow_subscriber_messages IS 'Allow messages from subscribers (people who follow you)';
COMMENT ON COLUMN public.users.filter_low_quality_messages IS 'Filter spam/low-quality message requests';
COMMENT ON COLUMN public.users.enable_debug_logs IS 'Enable debug logging for troubleshooting';
