ALTER TABLE transactions ADD COLUMN IF NOT EXISTS blockchain_block_number bigint;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS blockchain_block_hash text;
