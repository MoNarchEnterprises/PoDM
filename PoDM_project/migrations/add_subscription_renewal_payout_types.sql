-- Migration: add_subscription_renewal_payout_types.sql
-- Extends the transaction_type enum with the values the renewal job and payout
-- service write (renewSubscriptions.ts -> 'SubscriptionRenewal',
-- payout.service.ts -> 'Payout'). Without these values, inserts would be
-- rejected by the enum constraint (error 22P02).
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'SubscriptionRenewal';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'Payout';