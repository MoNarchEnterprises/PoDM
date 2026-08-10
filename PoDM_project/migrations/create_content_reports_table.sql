-- Migration: create_content_reports_table.sql
-- Dedicated content moderation table.
-- Replaces the never-applied 'reports' table (create_reports_table.sql), which
-- collided with the live admin analytics 'reports' table. Uses a
-- non-colliding name so content moderation reports work on the live DB.

-- Report status enum — only create if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS content_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content_id BIGINT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    details TEXT,
    status report_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_reports_content_id ON content_reports(content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);

-- Enable RLS — content-moderation reports gate direct client access.
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- DROP + CREATE (Postgres <15 does not support CREATE POLICY IF NOT EXISTS)

-- A user can only ever file a report in their own name.
DROP POLICY IF EXISTS "Users can report content as themselves" ON public.content_reports;
CREATE POLICY "Users can report content as themselves"
ON public.content_reports
FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- Admins see the moderation queue; reporters can check their own report status.
DROP POLICY IF EXISTS "Admins can view all content reports" ON public.content_reports;
CREATE POLICY "Admins can view all content reports"
ON public.content_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users can view their own content reports" ON public.content_reports;
CREATE POLICY "Users can view their own content reports"
ON public.content_reports
FOR SELECT
TO authenticated
USING (reporter_id = auth.uid());

-- No UPDATE/DELETE policies: report status is transitioned server-side and no
-- direct delete endpoint exists.