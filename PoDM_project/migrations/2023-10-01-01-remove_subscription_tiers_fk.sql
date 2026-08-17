-- Migration: 2023-10-01-01-remove_subscription_tiers_fk.sql
-- Purpose: The original catalog_price_snapshots table defined tier_id as a foreign key
-- to a non‑existent subscription_tiers table. This FK prevents inserts of valid tier IDs
-- stored on the creator profile. The migration drops the constraint so tier_id can be a
-- plain UUID referencing creator‑defined tiers.

ALTER TABLE catalog_price_snapshots
  DROP CONSTRAINT IF EXISTS catalog_price_snapshots_tier_id_fkey;
