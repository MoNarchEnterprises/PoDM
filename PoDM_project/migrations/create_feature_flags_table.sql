-- Migration: create_feature_flags_table.sql
-- Production-grade feature flag system with global flags, per-user overrides, and percentage rollout.

-- ── feature_flags: global flag definitions ─────────────────────────────

CREATE TABLE IF NOT EXISTS feature_flags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    enabled boolean DEFAULT false,
    rollout_percentage integer DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    description text DEFAULT '',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);

-- ── user_feature_flag_overrides: per-user opt-in / opt-out ─────────────

CREATE TABLE IF NOT EXISTS user_feature_flag_overrides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    flag_key text NOT NULL REFERENCES feature_flags(key) ON DELETE CASCADE,
    enabled boolean NOT NULL,
    reason text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, flag_key)
);

CREATE INDEX IF NOT EXISTS idx_user_ff_overrides_user ON user_feature_flag_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ff_overrides_key ON user_feature_flag_overrides(flag_key);

-- ── Seed default flags ─────────────────────────────────────────────────

INSERT INTO feature_flags (key, enabled, rollout_percentage, description) VALUES
    ('embedded_wallet_enabled',   false, 0,   'Master: allow embedded wallet creation for users'),
    ('gas_sponsorship_enabled',   false, 0,   'Allow gas sponsorship via paymaster for transactions'),
    ('embedded_payment_enabled',  false, 0,   'Allow payments via embedded wallet (tips, subs, PPV)'),
    ('wallet_recovery_enabled',   false, 0,   'Allow wallet recovery flow for embedded wallets'),
    ('smart_account_enabled',     false, 0,   'Deploy ERC-4337 smart accounts (vs EOA-only)')
ON CONFLICT (key) DO NOTHING;

-- ── Updated_at trigger ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER trg_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW EXECUTE FUNCTION update_feature_flags_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feature_flag_overrides ENABLE ROW LEVEL SECURITY;

-- Feature flags are readable by all authenticated users (for client-side evaluation)
DROP POLICY IF EXISTS feature_flags_select_all ON feature_flags;
CREATE POLICY feature_flags_select_all ON feature_flags
    FOR SELECT USING (true);

-- Only admins can modify flags (enforced at app layer via protect + adminOnly middleware)
DROP POLICY IF EXISTS feature_flags_modify_service ON feature_flags;
CREATE POLICY feature_flags_modify_service ON feature_flags
    FOR ALL USING (true) WITH CHECK (true);

-- Users can read their own overrides
DROP POLICY IF EXISTS user_ff_overrides_select_own ON user_feature_flag_overrides;
CREATE POLICY user_ff_overrides_select_own ON user_feature_flag_overrides
    FOR SELECT USING (auth.uid() = user_id);

-- Service can insert/update overrides
DROP POLICY IF EXISTS user_ff_overrides_modify_service ON user_feature_flag_overrides;
CREATE POLICY user_ff_overrides_modify_service ON user_feature_flag_overrides
    FOR ALL USING (true) WITH CHECK (true);
