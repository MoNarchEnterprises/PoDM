-- Add renewal retry tracking and grace period fields to subscriptions
-- fan_wallet_address and price backfill the fields the renewal claim function and
-- subscription service read/write; they were historically created ad-hoc on the
-- live DB, so IF NOT EXISTS keeps this idempotent for fresh restores.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS price integer DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS fan_wallet_address text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS renewal_attempts integer DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS renewal_locked_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS renewal_claim_id uuid;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS renewal_claimed_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS renewal_pending_tx_hash text;

-- renewal_attempts: incremented on each failed renewal attempt, reset on success
-- renewal_locked_at: set when subscription period ends and renewal fails,
--   content access is locked until renewal succeeds
-- After 3 failed attempts across 3 days, status moves to 'expired'

COMMENT ON COLUMN subscriptions.renewal_attempts IS 'Number of consecutive failed renewal attempts. Reset to 0 on success.';
COMMENT ON COLUMN subscriptions.renewal_locked_at IS 'Timestamp when content access was locked due to failed renewal. NULL = not locked.';
COMMENT ON COLUMN subscriptions.renewal_claim_id IS 'Worker claim token for the currently executing renewal attempt.';
COMMENT ON COLUMN subscriptions.renewal_claimed_at IS 'Timestamp of the current renewal worker claim; stale claims may be reclaimed after 30 minutes.';
COMMENT ON COLUMN subscriptions.renewal_pending_tx_hash IS 'On-chain renewal hash awaiting durable receipt verification; prevents a second charge after worker failure.';

CREATE OR REPLACE FUNCTION claim_subscription_renewal(p_subscription_id bigint, p_claim_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE subscriptions
    SET renewal_claim_id = p_claim_id, renewal_claimed_at = now()
    WHERE id = p_subscription_id
      AND status = 'active'
      AND next_billing_date <= now()
      AND fan_wallet_address IS NOT NULL
      AND (renewal_claimed_at IS NULL OR renewal_claimed_at < now() - interval '30 minutes');
    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION claim_subscription_renewal(bigint, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_subscription_renewal(bigint, uuid) FROM anon;
REVOKE ALL ON FUNCTION claim_subscription_renewal(bigint, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION claim_subscription_renewal(bigint, uuid) TO service_role;
