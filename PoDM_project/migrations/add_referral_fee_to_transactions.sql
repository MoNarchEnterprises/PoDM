-- Migration: Add referral_fee and referrer_id to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS referral_fee INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES profiles(id);
