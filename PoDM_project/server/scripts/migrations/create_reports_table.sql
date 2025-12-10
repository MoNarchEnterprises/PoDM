-- Create the 'reports' table for content moderation
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed');

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content_id BIGINT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status report_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_reports_content_id ON reports(content_id);
CREATE INDEX idx_reports_status ON reports(status);
