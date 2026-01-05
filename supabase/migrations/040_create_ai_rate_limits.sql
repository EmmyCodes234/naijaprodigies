-- Create AI usage logs for Rate Limiting
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    model TEXT DEFAULT 'llama-3.3-70b',
    action TEXT DEFAULT 'chat' -- 'chat' or 'search'
);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only Service Role can insert/read (The Edge Function uses Service Role)
CREATE POLICY "Service Role can manage AI logs"
  ON public.ai_usage_logs
  USING (true)
  WITH CHECK (true);

-- Index for fast counting (Rate Limiting)
CREATE INDEX idx_ai_usage_user_time ON public.ai_usage_logs(user_id, created_at DESC);
