-- Remove Stripe payment method from CHECK constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check
  CHECK (payment_method IN ('crypto', 'card_onramp', 'embedded_wallet', 'referral_bonus'));

-- Drop legacy Stripe columns from profiles (no longer used)
ALTER TABLE profiles DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS stripe_account_id;
