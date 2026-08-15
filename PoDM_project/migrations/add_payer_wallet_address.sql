ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS payer_wallet_address text;

COMMENT ON COLUMN transactions.payer_wallet_address IS
    'Wallet address recovered from the verified on-chain payment event; used to bind browser subscriptions to the payer that actually paid.';
