-- Migration: Add Enclave membership tracking to profiles
-- Description: Track which users are Enclave members and when they joined

ALTER TABLE profiles
ADD COLUMN is_enclave_member BOOLEAN DEFAULT false,
ADD COLUMN enclave_joined_at TIMESTAMP;

-- Add index for faster Enclave member queries
CREATE INDEX idx_profiles_enclave_member ON profiles(is_enclave_member) WHERE is_enclave_member = true;

-- Add comment
COMMENT ON COLUMN profiles.is_enclave_member IS 'Whether user is an Enclave member (gets 10% platform fee)';
COMMENT ON COLUMN profiles.enclave_joined_at IS 'Timestamp when user joined The Enclave';
