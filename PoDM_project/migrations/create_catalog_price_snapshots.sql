CREATE TABLE IF NOT EXISTS catalog_price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id),
  tier_id UUID NULL REFERENCES subscription_tiers(id),
  price_usdc_base_units BIGINT NOT NULL,
  catalog_version INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by content and tier
CREATE INDEX IF NOT EXISTS catalog_price_snapshots_content_idx ON catalog_price_snapshots (content_id, tier_id);
