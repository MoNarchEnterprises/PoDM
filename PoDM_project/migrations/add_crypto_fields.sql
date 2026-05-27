-- Migration: Add Crypto Wallet & Transaction Fields
-- Target: Supabase / PostgreSQL Database
-- Safely applies updates using IF NOT EXISTS checks.

-- 1. Update public.profiles table to hold wallet config
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS crypto_wallet_address text,
ADD COLUMN IF NOT EXISTS crypto_wallet_type text DEFAULT 'none' CHECK (crypto_wallet_type IN ('none', 'embedded', 'custom')),
ADD COLUMN IF NOT EXISTS crypto_wallet_payout_preference text DEFAULT 'debit_card' CHECK (crypto_wallet_payout_preference IN ('debit_card', 'on_chain'));

-- Create an index on wallet address for quick lookup during transaction mapping
CREATE INDEX IF NOT EXISTS idx_profiles_crypto_wallet ON public.profiles(crypto_wallet_address);

-- 2. Update public.transactions table to hold blockchain transaction details
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS blockchain_tx_hash text,
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'stripe' CHECK (payment_method IN ('stripe', 'crypto')),
ADD COLUMN IF NOT EXISTS payment_currency text DEFAULT 'USD' CHECK (payment_currency IN ('USD', 'USDC')),
ADD COLUMN IF NOT EXISTS chain_id integer;

-- Create an index on transaction hash for deduplication and checkups
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON public.transactions(blockchain_tx_hash);

COMMENT ON COLUMN public.profiles.crypto_wallet_address IS 'Stores the public wallet address (either embedded system address or custom self-custody address)';
COMMENT ON COLUMN public.profiles.crypto_wallet_type IS 'Distinguishes between Privy/Web3Auth managed embedded wallets and custom creator-managed wallets';
COMMENT ON COLUMN public.profiles.crypto_wallet_payout_preference IS 'Determines whether platform off-ramps (debit_card) or direct on-chain payouts (on_chain) are used';
COMMENT ON COLUMN public.transactions.blockchain_tx_hash IS 'Stores the cryptographic transaction hash on the Base network';
COMMENT ON COLUMN public.transactions.payment_method IS 'Tracks whether a transaction was completed via Stripe (Credit Card) or Crypto (USDC)';
COMMENT ON COLUMN public.transactions.payment_currency IS 'Specifies whether payment was in USD (Stripe) or USDC (Base Crypto)';
COMMENT ON COLUMN public.transactions.chain_id IS 'Blockchain network ID: 8453 for Base Mainnet, 84532 for Base Sepolia Testnet';
