-- Harden claim_subscription_renewal: a subscription that already has a broadcast
-- hash awaiting reconciliation (renewal_pending_tx_hash IS NOT NULL) must NOT be
-- claimable again — even after the 30-minute stale-claim window. Without this
-- guard, worker B could re-claim a sub whose worker A broadcast then crashed,
-- and re-broadcast => DOUBLE CHARGE. The pending hash is resolved exclusively by
-- the reconciliation phase of renewSubscriptions.
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
      AND renewal_pending_tx_hash IS NULL
      AND (renewal_claimed_at IS NULL OR renewal_claimed_at < now() - interval '30 minutes');
    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION claim_subscription_renewal(bigint, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_subscription_renewal(bigint, uuid) FROM anon;
REVOKE ALL ON FUNCTION claim_subscription_renewal(bigint, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION claim_subscription_renewal(bigint, uuid) TO service_role;