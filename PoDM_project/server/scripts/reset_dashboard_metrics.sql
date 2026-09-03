-- ==========================================================
-- PoDM: Reset Admin Dashboard Metrics & Test Records for Mainnet
-- Run this in your Supabase SQL Editor prior to launch.
-- ==========================================================

BEGIN;

-- 1. Reset Enclave membership on all profiles
UPDATE profiles 
SET 
  is_enclave_member = false,
  enclave_joined_at = NULL
WHERE is_enclave_member = true;

-- 2. Reset all Enclave applications to pending
UPDATE enclave_applications 
SET status = 'pending'
WHERE status != 'pending';

-- 3. Clear testnet/dev transactions so revenue starts at $0.00
TRUNCATE TABLE transactions CASCADE;

-- 4. Close all test support tickets
UPDATE support_tickets
SET status = 'Closed'
WHERE status != 'Closed';

-- 5. (Optional) If you want to reset subscriptions and analytics events:
-- TRUNCATE TABLE subscriptions CASCADE;
-- TRUNCATE TABLE analytics_events CASCADE;

COMMIT;
