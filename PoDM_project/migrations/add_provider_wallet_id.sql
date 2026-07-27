-- Migration: add_provider_wallet_id.sql
-- Stores the wallet provider's internal wallet ID (e.g. Privy wallet ID) so the
-- backend can call provider RPC endpoints (sign, etc.) that require it.
-- The user-facing wallet EOA address remains in crypto_wallet_address.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS crypto_wallet_provider_id text;

CREATE INDEX IF NOT EXISTS idx_profiles_provider_wallet_id ON profiles(crypto_wallet_provider_id);

COMMENT ON COLUMN public.profiles.crypto_wallet_provider_id IS 'Internal wallet ID at the embedded wallet provider (e.g. Privy wallet id), used for server-side signing RPCs';
