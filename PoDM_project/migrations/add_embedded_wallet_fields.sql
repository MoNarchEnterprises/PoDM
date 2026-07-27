-- Migration: add_embedded_wallet_fields.sql
-- Adds embedded wallet, smart account, and ERC-4337 columns to support the new payment architecture.

-- ── profiles: embedded wallet & smart account fields ───────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS smart_account_address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_provider text DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_status text DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_created_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_smart_account ON profiles(smart_account_address);

-- Constrain wallet_provider to known providers
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_wallet_provider_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_wallet_provider_check
    CHECK (wallet_provider IN ('none', 'privy', 'turnkey', 'dynamic', 'custom'));

-- Constrain wallet_status to known states
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_wallet_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_wallet_status_check
    CHECK (wallet_status IN ('none', 'creating', 'active', 'recovering', 'error'));

-- ── transactions: UserOperation tracking ───────────────────────────────

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_operation_hash text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS gas_sponsored boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_transactions_user_op_hash ON transactions(user_operation_hash);

-- Update payment_method constraint to include 'embedded_wallet'
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check
    CHECK (payment_method IN ('stripe', 'crypto', 'card_onramp', 'embedded_wallet'));

-- ── wallet_events: audit log for wallet lifecycle events ───────────────

CREATE TABLE IF NOT EXISTS wallet_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event text NOT NULL,
    wallet_address text,
    smart_account_address text,
    transaction_hash text,
    user_operation_hash text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_events_user ON wallet_events(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_events_event ON wallet_events(event);
CREATE INDEX IF NOT EXISTS idx_wallet_events_created ON wallet_events(created_at);

-- Constrain event types
ALTER TABLE wallet_events DROP CONSTRAINT IF EXISTS wallet_events_event_check;
ALTER TABLE wallet_events ADD CONSTRAINT wallet_events_event_check
    CHECK (event IN (
        'WalletCreated',
        'SmartAccountDeployed',
        'PaymentInitiated',
        'PaymentConfirmed',
        'PaymentFailed',
        'GasSponsored',
        'WalletRecoveryStarted',
        'WalletRecoveryCompleted'
    ));

-- RLS for wallet_events
ALTER TABLE wallet_events ENABLE ROW LEVEL SECURITY;

-- DROP + CREATE (Postgres <15 does not support CREATE POLICY IF NOT EXISTS)
DROP POLICY IF EXISTS wallet_events_select_own ON wallet_events;
CREATE POLICY wallet_events_select_own ON wallet_events
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS wallet_events_insert_service ON wallet_events;
CREATE POLICY wallet_events_insert_service ON wallet_events
    FOR INSERT WITH CHECK (true);
