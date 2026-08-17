-- Migration: create_wallet_verification_challenges.sql
-- Description: Server-issued cryptographic challenges for wallet ownership verification (H-02)

CREATE TABLE IF NOT EXISTS wallet_verification_challenges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    wallet_address text NOT NULL,
    nonce text NOT NULL,
    purpose text NOT NULL DEFAULT 'wallet_ownership',
    message text NOT NULL,
    issued_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_wallet_challenges_user_wallet 
    ON wallet_verification_challenges (user_id, wallet_address, used_at, expires_at);

-- Restrict to backend service_role only (defense-in-depth)
ALTER TABLE wallet_verification_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wallet_verification_challenges FROM anon, authenticated;
GRANT ALL ON wallet_verification_challenges TO service_role;
