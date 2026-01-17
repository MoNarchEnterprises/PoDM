-- Create contests table
CREATE TABLE IF NOT EXISTS contests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    entry_requirements JSONB DEFAULT '{}'::jsonb, -- e.g. { "tier_id": "..." }
    prize_description TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'canceled')),
    winner_id UUID REFERENCES profiles(id),
    entry_type TEXT DEFAULT 'standard', -- 'standard' or 'weighted_spend'
    entry_multiplier INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for contests
ALTER TABLE contests ENABLE ROW LEVEL SECURITY;

-- Policies for contests
-- Creators can view, insert, update their own contests
CREATE POLICY "Creators can manage their own contests" ON contests
    FOR ALL
    USING (auth.uid() = creator_id);

-- Fans (and everyone) can view active or completed contests
CREATE POLICY "Public can view active contests" ON contests
    FOR SELECT
    USING (status IN ('active', 'completed'));

-- Create contest_entries table
CREATE TABLE IF NOT EXISTS contest_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    fan_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(contest_id, fan_id) -- Prevent double entry manually
);

-- Enable RLS for contest_entries
ALTER TABLE contest_entries ENABLE ROW LEVEL SECURITY;

-- Policies for contest_entries
-- Creators can view entries for their contests
CREATE POLICY "Creators can view entries for their contests" ON contest_entries
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM contests WHERE contests.id = contest_entries.contest_id AND contests.creator_id = auth.uid()
    ));

-- Fans can manage their own entries (Insert/View)
CREATE POLICY "Fans can manage their own entries" ON contest_entries
    FOR ALL
    USING (auth.uid() = fan_id);
