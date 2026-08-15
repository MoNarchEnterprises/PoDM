-- Migration: add_payout_lock_rpc.sql
-- Description: Create acquire_payout_lock and release_payout_lock stored procedures in Supabase using Postgres advisory locks (V-A06)

CREATE OR REPLACE FUNCTION acquire_payout_lock(p_creator_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_lock_id BIGINT;
    v_acquired BOOLEAN;
BEGIN
    v_lock_id := ('x' || substr(md5(p_creator_id::text), 1, 15))::bit(64)::bigint;
    SELECT pg_try_advisory_lock(v_lock_id) INTO v_acquired;
    IF NOT v_acquired THEN
        RAISE EXCEPTION 'Payout lock currently held for creator %', p_creator_id;
    END IF;
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION release_payout_lock(p_creator_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_lock_id BIGINT;
BEGIN
    v_lock_id := ('x' || substr(md5(p_creator_id::text), 1, 15))::bit(64)::bigint;
    PERFORM pg_advisory_unlock(v_lock_id);
    RETURN TRUE;
END;
$$;
