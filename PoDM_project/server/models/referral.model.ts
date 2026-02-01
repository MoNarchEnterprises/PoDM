import supabase from '../config/supabaseClient';

export interface Referral {
    id: string;
    user_id: string;
    referral_code: string;
    bonus_type: 'cash' | 'percentage';
    bonus_value: number;
    uses_count: number;
    total_bonus_earned: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ReferralApplication {
    id: string;
    referral_id: string;
    application_id: string;
    applicant_user_id: string | null;
    bonus_awarded: number | null;
    bonus_awarded_at: string | null;
    created_at: string;
}

/**
 * Generate referral codes for a user (one for each bonus type)
 * @param userId - User's UUID
 * @param username - User's username (used to create codes)
 * @returns Array of created referral codes
 */
export const generateReferralCodes = async (userId: string, username: string): Promise<Referral[]> => {
    // Create two codes: username-CASH and username-PERCENT
    const cashCode = `${username.toUpperCase()}-CASH`;
    const percentCode = `${username.toUpperCase()}-PERCENT`;

    // Bonus values from creator acquisition strategy:
    // Cash: $50 base when referral earns $750 in first month
    //       + $25 speed bonus if achieved within 2 weeks (total $75)
    // Note: Speed bonus logic needs to be implemented separately
    const CASH_BONUS_AMOUNT = 50.00; // $50 base (+ $25 speed bonus to be added later)
    const PERCENTAGE_BONUS_VALUE = 1.00; // 1% for first 6 months

    const referralsToCreate = [
        {
            user_id: userId,
            referral_code: cashCode,
            bonus_type: 'cash',
            bonus_value: CASH_BONUS_AMOUNT
        },
        {
            user_id: userId,
            referral_code: percentCode,
            bonus_type: 'percentage',
            bonus_value: PERCENTAGE_BONUS_VALUE
        }
    ];

    const { data, error } = await supabase
        .from('referrals')
        .insert(referralsToCreate)
        .select();

    if (error) {
        console.error('Error generating referral codes:', error);
        throw new Error('Failed to generate referral codes');
    }

    return data as Referral[];
};

/**
 * Get all referral codes for a user
 * @param userId - User's UUID
 * @returns Array of user's referral codes
 */
export const getReferralsByUserId = async (userId: string): Promise<Referral[]> => {
    const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching referrals:', error);
        return [];
    }

    return data as Referral[];
};

/**
 * Validate a referral code exists and is active
 * @param code - Referral code to validate
 * @returns Referral object if valid, null otherwise
 */
export const validateReferralCode = async (code: string): Promise<Referral | null> => {
    const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referral_code', code.toUpperCase())
        .eq('is_active', true)
        .single();

    if (error) {
        console.error('Error validating referral code:', error);
        return null;
    }

    return data as Referral;
};

/**
 * Track that a referral code was used in an application
 * @param code - Referral code used
 * @param applicationId - Enclave application ID
 * @returns Created referral application record
 */
export const trackReferralUse = async (code: string, applicationId: string): Promise<ReferralApplication | null> => {
    // First, get the referral
    const referral = await validateReferralCode(code);
    if (!referral) {
        return null;
    }

    // Create the referral application record
    const { data, error } = await supabase
        .from('referral_applications')
        .insert({
            referral_id: referral.id,
            application_id: applicationId
        })
        .select()
        .single();

    if (error) {
        console.error('Error tracking referral use:', error);
        return null;
    }

    // Increment uses_count on the referral
    await supabase
        .from('referrals')
        .update({ uses_count: referral.uses_count + 1 })
        .eq('id', referral.id);

    return data as ReferralApplication;
};

/**
 * Award bonus to referrer when their referral's application is accepted
 * @param applicationId - Enclave application ID
 * @param applicantUserId - New user ID created for the applicant
 * @returns Updated referral application record
 */
export const awardReferralBonus = async (applicationId: string, applicantUserId: string): Promise<void> => {
    // Get the referral application record
    const { data: refApp, error: refAppError } = await supabase
        .from('referral_applications')
        .select('*, referrals(*)')
        .eq('application_id', applicationId)
        .single();

    if (refAppError || !refApp) {
        // No referral for this application, that's okay
        return;
    }

    const referral = refApp.referrals as unknown as Referral;
    let bonusAmount = 0;

    if (referral.bonus_type === 'cash') {
        // For cash bonus, award the fixed amount immediately
        bonusAmount = referral.bonus_value;

        // TODO: Implement actual payment/credit to user's account
        // For now, we just track it
        console.log(`Awarding $${bonusAmount} cash bonus to user ${referral.user_id}`);
    } else if (referral.bonus_type === 'percentage') {
        // For percentage bonus, we'll track it but actual calculation happens over time
        // This would be calculated based on the referred user's earnings
        bonusAmount = 0; // Will be calculated later based on earnings
        console.log(`Tracking ${referral.bonus_value}% revenue share for user ${referral.user_id}`);
    }

    // Update referral application with bonus info
    await supabase
        .from('referral_applications')
        .update({
            applicant_user_id: applicantUserId,
            bonus_awarded: bonusAmount,
            bonus_awarded_at: new Date().toISOString()
        })
        .eq('id', refApp.id);

    // Update total bonus earned on referral
    await supabase
        .from('referrals')
        .update({
            total_bonus_earned: referral.total_bonus_earned + bonusAmount
        })
        .eq('id', referral.id);
};

/**
 * Get referral statistics for a user
 * @param userId - User's UUID
 * @returns Statistics object
 */
export const getReferralStats = async (userId: string) => {
    const { data: referrals } = await supabase
        .from('referrals')
        .select(`
            *,
            referral_applications(*)
        `)
        .eq('user_id', userId);

    if (!referrals) {
        return {
            totalUses: 0,
            totalEarned: 0,
            cashReferrals: 0,
            percentageReferrals: 0
        };
    }

    const stats = {
        totalUses: 0,
        totalEarned: 0,
        cashReferrals: 0,
        percentageReferrals: 0
    };

    referrals.forEach((ref: any) => {
        stats.totalUses += ref.uses_count;
        stats.totalEarned += ref.total_bonus_earned;

        const applications = ref.referral_applications || [];
        applications.forEach((app: any) => {
            if (app.applicant_user_id) {
                if (ref.bonus_type === 'cash') {
                    stats.cashReferrals++;
                } else {
                    stats.percentageReferrals++;
                }
            }
        });
    });

    return stats;
};

/**
 * Check if referred creator has hit $750 milestone and award bonuses
 * This should be called whenever a referred creator's earnings are updated
 * @param userId - The referred creator's user ID
 * @param totalEarnings - Their total earnings to date
 */
export const checkAndAwardMilestoneBonus = async (userId: string, totalEarnings: number): Promise<void> => {
    // Check if this user was referred
    const { data: refApp, error: refAppError } = await supabase
        .from('referral_applications')
        .select('*, referrals(*), enclave_applications(created_at)')
        .eq('applicant_user_id', userId)
        .single();

    if (refAppError || !refApp) {
        // User wasn't referred, nothing to do
        return;
    }

    const referral = refApp.referrals as unknown as Referral;

    // Only process cash bonuses
    if (referral.bonus_type !== 'cash') {
        return;
    }

    // Check if they've already been awarded the base bonus
    if (refApp.bonus_awarded && refApp.bonus_awarded > 0) {
        return; // Already processed
    }

    // Check if they've hit the $750 milestone
    if (totalEarnings >= 750) {
        const now = new Date();
        const applicationCreatedAt = new Date((refApp.enclave_applications as any).created_at);
        const daysSinceCreation = (now.getTime() - applicationCreatedAt.getTime()) / (1000 * 60 * 60 * 24);

        // Base bonus: $50 - only awarded if $750 reached within first 30 days (1 month)
        if (daysSinceCreation > 30) {
            console.log(`User ${userId} hit $750 but took ${daysSinceCreation.toFixed(1)} days (> 30 days). No bonus awarded.`);
            return; // Too late, no bonus
        }

        let bonusAmount = 50.00; // Base bonus
        let speedBonusAwarded = false;
        let speedBonusAmount = 0;

        // Speed bonus: Additional $25 if achieved within 14 days (2 weeks)
        if (daysSinceCreation <= 14) {
            speedBonusAwarded = true;
            speedBonusAmount = 25.00;
            bonusAmount += speedBonusAmount;
            console.log(`🎉 Speed bonus! User ${userId} hit $750 in ${daysSinceCreation.toFixed(1)} days`);
        } else {
            console.log(`User ${userId} hit $750 in ${daysSinceCreation.toFixed(1)} days (base bonus only)`);
        }

        console.log(`Awarding $${bonusAmount} cash bonus to user ${referral.user_id} (base: $50, speed: $${speedBonusAmount})`);

        // Update referral application
        await supabase
            .from('referral_applications')
            .update({
                milestone_750_reached_at: now.toISOString(),
                bonus_awarded: bonusAmount,
                bonus_awarded_at: now.toISOString(),
                speed_bonus_awarded: speedBonusAwarded,
                speed_bonus_amount: speedBonusAmount
            })
            .eq('id', refApp.id);

        // Update total bonus earned on referral
        await supabase
            .from('referrals')
            .update({
                total_bonus_earned: referral.total_bonus_earned + bonusAmount
            })
            .eq('id', referral.id);

        // TODO: Implement actual payment/credit to referrer's account
        // This would integrate with your payment system to credit the referrer
    }
};

