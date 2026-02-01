-- Migration: Create enclave_applications table
-- Description: Table to store applications for The Enclave founding creator program

CREATE TABLE IF NOT EXISTS enclave_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    current_platform VARCHAR(100) NOT NULL,
    follower_count VARCHAR(50) NOT NULL,
    monthly_earnings VARCHAR(50),
    content_type TEXT[] NOT NULL, -- Array of content types
    why_join TEXT NOT NULL,
    how_heard VARCHAR(100) NOT NULL,
    referral_code VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- pending, accepted, rejected
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    reviewed_at TIMESTAMP,
    reviewed_by UUID, -- Admin user ID (no FK constraint to avoid dependency)
    notes TEXT -- Admin notes
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_enclave_applications_email ON enclave_applications(email);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_enclave_applications_status ON enclave_applications(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_enclave_applications_created_at ON enclave_applications(created_at DESC);

-- Add comment
COMMENT ON TABLE enclave_applications IS 'Applications for The Enclave founding creator program (limited to 50 spots)';
