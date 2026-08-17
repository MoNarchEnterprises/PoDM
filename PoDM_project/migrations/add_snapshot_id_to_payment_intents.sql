ALTER TABLE payment_intents ADD COLUMN snapshot_id UUID REFERENCES catalog_price_snapshots(id);
