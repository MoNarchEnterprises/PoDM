-- Migration: Expand Payout Preference Constraints
-- Target: Supabase / PostgreSQL Database
-- Purpose: Safely drops the old payout preference check constraint and adds Base, Monad, and MegaETH network values.

-- 1. Drop the legacy check constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_crypto_wallet_payout_preference_check;

-- 2. Apply the expanded check constraint
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_crypto_wallet_payout_preference_check 
CHECK (crypto_wallet_payout_preference IN ('debit_card', 'on_chain', 'base', 'monad', 'megaeth'));

-- 3. Set the default to 'base' for existing profiles without a preference
UPDATE public.profiles
SET crypto_wallet_payout_preference = 'base'
WHERE crypto_wallet_payout_preference IS NULL OR crypto_wallet_payout_preference NOT IN ('debit_card', 'on_chain', 'base', 'monad', 'megaeth');

-- 4. Update comment to reflect the new options
COMMENT ON COLUMN public.profiles.crypto_wallet_payout_preference IS 'Determines the preferred ecosystem payout network (base, monad, megaeth) or legacy preferences (debit_card, on_chain)';
