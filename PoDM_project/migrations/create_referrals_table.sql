-- Migration: Create referrals system tables
-- Description: Tables for tracking referral codes and their usage for Enclave applications

-- Create referrals table to store user referral codes
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referral_code VARCHAR(100) NOT NULL UNIQUE,
    bonus_type VARCHAR(20) NOT NULL CHECK (bonus_type IN ('cash', 'percentage')),
    bonus_value DECIMAL(10, 2) NOT NULL, -- Dollar amount for cash, percentage for percentage type
    uses_count INTEGER DEFAULT 0 NOT NULL,
    total_bonus_earned DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create referral_applications junction table to track which applications used which codes
CREATE TABLE IF NOT EXISTS referral_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES enclave_applications(id) ON DELETE CASCADE,
    applicant_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Set when application is accepted
    bonus_awarded DECIMAL(10, 2), -- Actual bonus amount awarded (base + speed bonus)
    bonus_awarded_at TIMESTAMP,
    milestone_750_reached_at TIMESTAMP, -- When the $750 milestone was reached
    speed_bonus_awarded BOOLEAN DEFAULT false, -- Whether speed bonus was awarded
    speed_bonus_amount DECIMAL(10, 2) DEFAULT 0, -- Amount of speed bonus ($25 if awarded)
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(application_id) -- Each application can only be linked to one referral
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_active ON referrals(is_active);
CREATE INDEX IF NOT EXISTS idx_referral_applications_referral_id ON referral_applications(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_applications_application_id ON referral_applications(application_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_referrals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_update_referrals_updated_at
    BEFORE UPDATE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_referrals_updated_at();

-- Add comments
COMMENT ON TABLE referrals IS 'Stores user referral codes for Enclave application referrals';
COMMENT ON TABLE referral_applications IS 'Tracks which Enclave applications used which referral codes';
COMMENT ON COLUMN referrals.bonus_type IS 'Type of bonus: cash (fixed amount) or percentage (revenue share)';
COMMENT ON COLUMN referrals.bonus_value IS 'For cash: dollar amount (e.g., 100.00). For percentage: percentage value (e.g., 5.00 for 5%)';
