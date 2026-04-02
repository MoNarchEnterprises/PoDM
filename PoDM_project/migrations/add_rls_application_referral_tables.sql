-- Migration: Add RLS policies for enclave_applications, referral_applications, and referrals
-- Description: Implement Row Level Security for application forms and referral systems.

-- Enable RLS
ALTER TABLE enclave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- 1. enclave_applications Policies
-- -------------------------------------------------------------

-- Admins can do everything
DROP POLICY IF EXISTS "Admins have full access to enclave_applications" ON enclave_applications;
CREATE POLICY "Admins have full access to enclave_applications"
    ON enclave_applications FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Public can insert (submit application)
DROP POLICY IF EXISTS "Anyone can submit an enclave application" ON enclave_applications;
CREATE POLICY "Anyone can submit an enclave application"
    ON enclave_applications FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- -------------------------------------------------------------
-- 2. referral_applications Policies
-- -------------------------------------------------------------

-- Admins can do everything
DROP POLICY IF EXISTS "Admins have full access to referral_applications" ON referral_applications;
CREATE POLICY "Admins have full access to referral_applications"
    ON referral_applications FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Public can insert (when submitting the enclave form)
DROP POLICY IF EXISTS "Anyone can create a referral_application link" ON referral_applications;
CREATE POLICY "Anyone can create a referral_application link"
    ON referral_applications FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Referrers can select applications that used their code
DROP POLICY IF EXISTS "Referrers can view applications using their code" ON referral_applications;
CREATE POLICY "Referrers can view applications using their code"
    ON referral_applications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM referrals 
            WHERE referrals.id = referral_applications.referral_id 
            AND referrals.user_id = auth.uid()
        )
    );

-- Applicants can view their own application connection
DROP POLICY IF EXISTS "Applicants can view their own referral applications" ON referral_applications;
CREATE POLICY "Applicants can view their own referral applications"
    ON referral_applications FOR SELECT
    USING (applicant_user_id = auth.uid());

-- -------------------------------------------------------------
-- 3. referrals Policies
-- -------------------------------------------------------------

-- Admins can do everything
DROP POLICY IF EXISTS "Admins have full access to referrals" ON referrals;
CREATE POLICY "Admins have full access to referrals"
    ON referrals FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Users can select their own referrals
DROP POLICY IF EXISTS "Users can view their own referrals" ON referrals;
CREATE POLICY "Users can view their own referrals"
    ON referrals FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own referrals
DROP POLICY IF EXISTS "Users can create their own referrals" ON referrals;
CREATE POLICY "Users can create their own referrals"
    ON referrals FOR INSERT
    WITH CHECK (user_id = auth.uid());
