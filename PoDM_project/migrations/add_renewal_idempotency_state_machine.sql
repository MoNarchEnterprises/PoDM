-- Migration: add_renewal_idempotency_state_machine.sql
-- Description: Implement explicit state machine, deterministic renewal_id, lease tracking,
-- and database uniqueness constraints for subscription renewal idempotency (H-04).

-- 1. Add renewal state tracking columns to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS renewal_status text DEFAULT 'PENDING';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS renewal_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS renewal_period timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS renewal_started_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS renewal_confirmed_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS renewal_error text;

COMMENT ON COLUMN subscriptions.renewal_status IS 'State machine status: PENDING, PROCESSING, SUBMITTED, CONFIRMED, FAILED, RETRYABLE';
COMMENT ON COLUMN subscriptions.renewal_id IS 'Deterministic unique renewal identifier for the active renewal period (e.g. renewal:sub_id:period)';
COMMENT ON COLUMN subscriptions.renewal_period IS 'The billing period timestamp being renewed';
COMMENT ON COLUMN subscriptions.renewal_started_at IS 'Timestamp when the worker claimed the renewal attempt (used for lease timeouts)';
COMMENT ON COLUMN subscriptions.renewal_confirmed_at IS 'Timestamp when the renewal payment was confirmed and settled on-chain';
COMMENT ON COLUMN subscriptions.renewal_error IS 'Last error message encountered during renewal attempt';

-- 2. Add renewal_id tracking and uniqueness constraint to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS renewal_id text;
COMMENT ON COLUMN transactions.renewal_id IS 'Deterministic renewal identifier matching subscriptions.renewal_id (enforces at-most-once payment per period)';

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_renewal_id_unique
ON transactions(renewal_id)
WHERE renewal_id IS NOT NULL;

-- 3. Atomic renewal claim RPC with explicit state transitions & lease guards
CREATE OR REPLACE FUNCTION claim_subscription_renewal(
    p_subscription_id bigint,
    p_claim_id uuid,
    p_renewal_id text,
    p_renewal_period timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE subscriptions
    SET
        renewal_claim_id = p_claim_id,
        renewal_id = p_renewal_id,
        renewal_period = p_renewal_period,
        renewal_status = 'PROCESSING',
        renewal_started_at = now(),
        renewal_claimed_at = now(),
        renewal_error = NULL
    WHERE id = p_subscription_id
      AND status = 'active'
      AND next_billing_date <= now()
      AND fan_wallet_address IS NOT NULL
      AND renewal_pending_tx_hash IS NULL
      AND (
          renewal_status IS NULL
          OR renewal_status IN ('PENDING', 'RETRYABLE', 'FAILED')
          OR (renewal_status = 'PROCESSING' AND renewal_started_at < now() - interval '30 minutes')
      );
    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION claim_subscription_renewal(bigint, uuid, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_subscription_renewal(bigint, uuid, text, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION claim_subscription_renewal(bigint, uuid, text, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION claim_subscription_renewal(bigint, uuid, text, timestamptz) TO service_role;
