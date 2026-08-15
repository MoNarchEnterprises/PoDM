-- Atomic payout reservations. This replaces session-scoped advisory locks,
-- which are unsafe when Supabase RPC calls use different pooled sessions.
CREATE TABLE IF NOT EXISTS payout_reservations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount integer NOT NULL CHECK (amount > 0),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'released')),
    blockchain_tx_hash text,
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS payout_reservations_one_pending_per_creator
    ON payout_reservations (creator_id) WHERE status = 'pending';

CREATE OR REPLACE FUNCTION reserve_payout(p_creator_id uuid, p_amount integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    earnings integer;
    paid_out integer;
    reserved integer;
    reservation_id uuid;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Payout amount must be positive';
    END IF;

    -- Transaction-scoped: it cannot leak across pooled RPC sessions.
    PERFORM pg_advisory_xact_lock(hashtextextended(p_creator_id::text, 0));

    IF EXISTS (
        SELECT 1 FROM payout_reservations
        WHERE creator_id = p_creator_id AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'Another payout is already being processed for this creator';
    END IF;

    SELECT COALESCE(SUM(creator_payout), 0)::integer INTO earnings
    FROM transactions
    WHERE creator_id = p_creator_id
      AND status = 'Cleared'
      AND type IN ('Subscription', 'Tip', 'PPV Message', 'PPV Post', 'SubscriptionRenewal');

    SELECT COALESCE(SUM(amount), 0)::integer INTO paid_out
    FROM transactions
    WHERE creator_id = p_creator_id AND type = 'Payout' AND status = 'Cleared';

    SELECT COALESCE(SUM(amount), 0)::integer INTO reserved
    FROM payout_reservations
    WHERE creator_id = p_creator_id AND status = 'pending';

    IF p_amount > earnings - paid_out - reserved THEN
        RAISE EXCEPTION 'Insufficient available payout balance';
    END IF;

    INSERT INTO payout_reservations (creator_id, amount)
    VALUES (p_creator_id, p_amount)
    RETURNING id INTO reservation_id;

    RETURN reservation_id;
END;
$$;

CREATE OR REPLACE FUNCTION complete_payout_reservation(p_reservation_id uuid, p_tx_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE payout_reservations
    SET status = 'completed', blockchain_tx_hash = p_tx_hash, completed_at = now()
    WHERE id = p_reservation_id AND status = 'pending';
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION release_payout_reservation(p_reservation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE payout_reservations
    SET status = 'released', completed_at = now()
    WHERE id = p_reservation_id AND status = 'pending';
    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION reserve_payout(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION complete_payout_reservation(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION release_payout_reservation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reserve_payout(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION complete_payout_reservation(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION release_payout_reservation(uuid) TO service_role;
