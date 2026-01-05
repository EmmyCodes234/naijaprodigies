-- Onboarding Schema Migration
-- Adds support for user onboarding flow and interest topics

-- 1. Add onboarding_completed flag to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- 2. Create interest_topics table with predefined topics
CREATE TABLE IF NOT EXISTS public.interest_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT, -- Icon name for UI (e.g., 'ph:game-controller')
    color TEXT, -- Hex color for UI styling
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create user_interests junction table
CREATE TABLE IF NOT EXISTS public.user_interests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    topic_id UUID REFERENCES public.interest_topics(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

-- 4. Enable RLS
ALTER TABLE public.interest_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for interest_topics (public read)
CREATE POLICY "Interest topics are viewable by everyone" 
    ON public.interest_topics FOR SELECT 
    USING (true);

-- 6. RLS Policies for user_interests
CREATE POLICY "Users can view their own interests" 
    ON public.user_interests FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = user_id
            AND users.auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can add their own interests" 
    ON public.user_interests FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = user_id
            AND users.auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can remove their own interests" 
    ON public.user_interests FOR DELETE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = user_id
            AND users.auth_id = auth.uid()
        )
    );

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON public.user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_topic_id ON public.user_interests(topic_id);
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON public.users(onboarding_completed);

-- 8. Insert predefined topics with matching icons
INSERT INTO public.interest_topics (name, slug, icon, color) VALUES
    ('Scrabble', 'scrabble', 'ph:letter-circle-h', '#10B981'),
    ('Word Games', 'word-games', 'ph:text-aa', '#6366F1'),
    ('Board Games', 'board-games', 'ph:puzzle-piece', '#F59E0B'),
    ('Strategy', 'strategy', 'ph:chess-rook', '#EC4899'),
    ('Technology', 'technology', 'ph:laptop', '#3B82F6'),
    ('Business', 'business', 'ph:chart-line-up', '#8B5CF6'),
    ('Players', 'players', 'ph:user-circle', '#14B8A6'),
    ('Tournaments', 'tournaments', 'ph:medal', '#F97316')
ON CONFLICT (slug) DO UPDATE SET icon = EXCLUDED.icon;
