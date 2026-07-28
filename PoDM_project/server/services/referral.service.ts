import supabase from '../config/supabaseClient';
import * as ReferralModel from '../models/referral.model';

export interface PercentageReferralInfo {
    referrerId: string;
    referralId: string;
    referredSince: Date;
}

export interface ReferralFeeCalculation {
    referralFee: number;
    referrerId: string | null;
}

export interface ReferrerEarnings {
    referralFeeEarned: number;
    cashBonusEarned: number;
    totalReferred: number;
    cashReferrals: number;
    percentageReferrals: number;
}

/**
 * Checks if a creator was referred under a percentage (revenue-share) referral code.
 * Only matches bonus_type = 'percentage' (mutually exclusive with cash).
 * Returns null if not applicable or outside the 180-day window.
 */
export async function getPercentageReferralInfo(creatorId: string): Promise<PercentageReferralInfo | null> {
    if (!creatorId) return null;

    try {
        const { data: refApp, error } = await supabase
            .from('referral_applications')
            .select('*, referrals(*)')
            .eq('applicant_user_id', creatorId)
            .maybeSingle();

        if (error || !refApp || !refApp.referrals) return null;

        const referral = refApp.referrals as any;
        if (referral.bonus_type !== 'percentage') return null;

        const referredSince = new Date(refApp.created_at);
        const now = new Date();
        const MS_PER_DAY = 1000 * 60 * 60 * 24;
        const daysSinceReferral = (now.getTime() - referredSince.getTime()) / MS_PER_DAY;

        if (daysSinceReferral > 180) return null; // Outside 180-day (6-month) window

        return {
            referrerId: referral.user_id,
            referralId: referral.id,
            referredSince,
        };
    } catch (err) {
        console.error('[ReferralService] Error looking up percentage referral info:', err);
        return null;
    }
}

/**
 * Calculates the referral fee for a transaction.
 * The fee is 1% of the gross transaction payment (amountInCents) and is deducted
 * from the platform's commission, ensuring the referred creator's payout is never altered.
 */
export async function calculateReferralFee(params: {
    creatorId: string;
    amountInCents: number;
    commissionRate: number;
}): Promise<ReferralFeeCalculation> {
    const { creatorId, amountInCents, commissionRate } = params;

    const refInfo = await getPercentageReferralInfo(creatorId);
    if (!refInfo) {
        return { referralFee: 0, referrerId: null };
    }

    const platformFee = Math.round(amountInCents * (commissionRate / 100));
    let referralFee = Math.round(amountInCents * 0.01); // 1% of gross transaction payment

    // Cap referral fee so platform fee never drops below zero
    if (referralFee > platformFee) {
        referralFee = platformFee;
    }

    return {
        referralFee,
        referrerId: refInfo.referrerId,
    };
}

/**
 * Updates the referrer's referral_fee_earned column after a transaction with a referral fee.
 * Fire-and-forget helper that catches errors internally.
 */
export async function recordReferralFee(referrerId: string, feeAmount: number): Promise<void> {
    if (!referrerId || feeAmount <= 0) return;

    try {
        const { data: referral } = await supabase
            .from('referrals')
            .select('id, referral_fee_earned')
            .eq('user_id', referrerId)
            .eq('bonus_type', 'percentage')
            .maybeSingle();

        if (referral) {
            const updatedFeeEarned = (referral.referral_fee_earned || 0) + feeAmount;
            await supabase
                .from('referrals')
                .update({ referral_fee_earned: updatedFeeEarned })
                .eq('id', referral.id);
        }
    } catch (err) {
        console.error(`[ReferralService] Error recording referral fee for referrer ${referrerId}:`, err);
    }
}

/**
 * Checks and awards milestone cash bonuses for referred creators who hit earnings thresholds.
 */
export async function awardMilestoneBonus(creatorId: string, totalEarnings: number): Promise<void> {
    await ReferralModel.checkAndAwardMilestoneBonus(creatorId, totalEarnings);
}

/**
 * Gets combined referral earnings stats for a referrer (both 1% revenue share and cash bonuses).
 */
export async function getReferrerEarnings(userId: string): Promise<ReferrerEarnings> {
    const { data: referrals } = await supabase
        .from('referrals')
        .select(`
            *,
            referral_applications(*)
        `)
        .eq('user_id', userId);

    if (!referrals || referrals.length === 0) {
        return {
            referralFeeEarned: 0,
            cashBonusEarned: 0,
            totalReferred: 0,
            cashReferrals: 0,
            percentageReferrals: 0,
        };
    }

    let referralFeeEarned = 0;
    let cashBonusEarned = 0;
    let cashReferrals = 0;
    let percentageReferrals = 0;

    referrals.forEach((ref: any) => {
        if (ref.bonus_type === 'percentage') {
            referralFeeEarned += ref.referral_fee_earned || 0;
        } else if (ref.bonus_type === 'cash') {
            cashBonusEarned += ref.total_bonus_earned || 0;
        }

        const applications = ref.referral_applications || [];
        applications.forEach((app: any) => {
            if (app.applicant_user_id) {
                if (ref.bonus_type === 'cash') {
                    cashReferrals++;
                } else {
                    percentageReferrals++;
                }
            }
        });
    });

    return {
        referralFeeEarned,
        cashBonusEarned,
        totalReferred: cashReferrals + percentageReferrals,
        cashReferrals,
        percentageReferrals,
    };
}
