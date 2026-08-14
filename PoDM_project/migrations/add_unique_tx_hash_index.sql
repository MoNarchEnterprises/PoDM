-- Migration: add_unique_tx_hash_index.sql
-- Description: Replace non-unique index idx_transactions_tx_hash with a unique index to enforce atomic transaction hash deduplication (V-A01)

DROP INDEX IF EXISTS idx_transactions_tx_hash;
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_tx_hash_unique ON transactions(blockchain_tx_hash) WHERE blockchain_tx_hash IS NOT NULL;
