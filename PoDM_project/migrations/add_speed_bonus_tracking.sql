-- Migration: Add speed bonus tracking to referral_applications
-- Description: Track when referred creators hit $750 milestone for speed bonus calculation

-- Add columns to track milestone achievement
ALTER TABLE referral_applications
ADD COLUMN milestone_750_reached_at TIMESTAMP,
ADD COLUMN speed_bonus_awarded BOOLEAN DEFAULT false,
ADD COLUMN speed_bonus_amount DECIMAL(10, 2) DEFAULT 0;

-- Add comment
COMMENT ON COLUMN referral_applications.milestone_750_reached_at IS 'Timestamp when referred creator first earned $750';
COMMENT ON COLUMN referral_applications.speed_bonus_awarded IS 'Whether the $25 speed bonus was awarded (if $750 reached within 2 weeks)';
COMMENT ON COLUMN referral_applications.speed_bonus_amount IS 'Amount of speed bonus awarded (0 or 25)';
