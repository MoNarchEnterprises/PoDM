-- Migration: Add referral_fee_earned to referrals table
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referral_fee_earned INTEGER DEFAULT 0;
