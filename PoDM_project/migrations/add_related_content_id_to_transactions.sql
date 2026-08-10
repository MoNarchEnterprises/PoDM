-- Migration: add_related_content_id_to_transactions.sql
-- Tracks the content a transaction was made for (PPV unlock, tips).
-- Column already exists on the live DB; this closes the drift gap for fresh restores.

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS related_content_id BIGINT REFERENCES content(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_related_content ON transactions(related_content_id) WHERE related_content_id IS NOT NULL;