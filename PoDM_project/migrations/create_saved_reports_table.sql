
-- Create saved_reports table
CREATE TABLE IF NOT EXISTS saved_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    metrics TEXT NOT NULL,
    filters TEXT,
    date_range JSONB,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster sorting/retrieval
CREATE INDEX IF NOT EXISTS idx_saved_reports_created_at ON saved_reports(created_at DESC);

-- Enable RLS — saved platform-analytics snapshots are admin-only.
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- DROP + CREATE (Postgres <15 does not support CREATE POLICY IF NOT EXISTS)
DROP POLICY IF EXISTS "Admins can view saved reports" ON public.saved_reports;
CREATE POLICY "Admins can view saved reports"
ON public.saved_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can insert saved reports" ON public.saved_reports;
CREATE POLICY "Admins can insert saved reports"
ON public.saved_reports
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
