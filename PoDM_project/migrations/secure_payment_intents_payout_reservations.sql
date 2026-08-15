-- Lock down payment_intents and payout_reservations: both are written and read
-- exclusively by the server via the service role (SECURITY DEFINER reservation
-- functions and the reconciler job). Anon/authenticated must have no direct DML
-- and RLS must be enabled so any accidental grant is inert.

ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_reservations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON payment_intents FROM PUBLIC;
REVOKE ALL ON payment_intents FROM anon;
REVOKE ALL ON payment_intents FROM authenticated;
GRANT ALL ON payment_intents TO service_role;

REVOKE ALL ON payout_reservations FROM PUBLIC;
REVOKE ALL ON payout_reservations FROM anon;
REVOKE ALL ON payout_reservations FROM authenticated;
GRANT ALL ON payout_reservations TO service_role;