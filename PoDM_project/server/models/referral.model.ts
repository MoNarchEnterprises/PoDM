import supabase from '../config/supabaseClient';
import { handleQuery, handleList } from '../utils/database';

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

export const generateReferralCodes = async (userId: string, username: string): Promise<Referral[]> => {
    const cashCode = `${username.toUpperCase()}-CASH`;
    const percentCode = `${username.toUpperCase()}-PERCENT`;

    const CASH_BONUS_AMOUNT = 50.00;
    const PERCENTAGE_BONUS_VALUE = 1.00;

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

export const getReferralsByUserId = async (userId: string): Promise<Referral[]> => {
    const data = await handleList<Referral>(
        supabase.from('referrals').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        'fetch referrals by user ID'
    );
    return data || [];
};

export const validateReferralCode = async (code: string): Promise<Referral | null> => {
    return handleQuery<Referral>(
        supabase.from('referrals').select('*').eq('referral_code', code.toUpperCase()).eq('is_active', true).single(),
        'validate referral code'
    );
};

export const trackReferralUse = async (code: string, applicationId: string): Promise<ReferralApplication | null> => {
    const referral = await validateReferralCode(code);
    if (!referral) {
        return null;
    }

    const data = await handleQuery<ReferralApplication>(
        supabase.from('referral_applications').insert({
            referral_id: referral.id,
            application_id: applicationId
        }).select().single(),
        'track referral use'
    );
    if (!data) return null;

    await supabase
        .from('referrals')
        .update({ uses_count: referral.uses_count + 1 })
        .eq('id', referral.id);

    return data as ReferralApplication;
};

export const awardReferralBonus = async (applicationId: string, applicantUserId: string): Promise<void> => {
    const { data: refApp, error: refAppError } = await supabase
        .from('referral_applications')
        .select('*, referrals(*)')
        .eq('application_id', applicationId)
        .single();

    if (refAppError || !refApp) {
        return;
    }

    const referral = refApp.referrals as unknown as Referral;
    let bonusAmount = 0;

    if (referral.bonus_type === 'cash') {
        bonusAmount = referral.bonus_value;
        console.log(`Awarding $${bonusAmount} cash bonus to user ${referral.user_id}`);
    } else if (referral.bonus_type === 'percentage') {
        bonusAmount = 0;
        console.log(`Tracking ${referral.bonus_value}% revenue share for user ${referral.user_id}`);
    }

    await supabase
        .from('referral_applications')
        .update({
            applicant_user_id: applicantUserId,
            bonus_awarded: bonusAmount,
            bonus_awarded_at: new Date().toISOString()
        })
        .eq('id', refApp.id);

    await supabase
        .from('referrals')
        .update({
            total_bonus_earned: referral.total_bonus_earned + bonusAmount
        })
        .eq('id', referral.id);
};

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

export const checkAndAwardMilestoneBonus = async (userId: string, totalEarnings: number): Promise<void> => {
    const { data: refApp, error: refAppError } = await supabase
        .from('referral_applications')
        .select('*, referrals(*), enclave_applications(created_at)')
        .eq('applicant_user_id', userId)
        .single();

    if (refAppError || !refApp) {
        return;
    }

    const referral = refApp.referrals as unknown as Referral;

    if (referral.bonus_type !== 'cash') {
        return;
    }

    if (refApp.bonus_awarded && refApp.bonus_awarded > 0) {
        return;
    }

    if (totalEarnings >= 750) {
        const now = new Date();
        const applicationCreatedAt = new Date((refApp.enclave_applications as any).created_at);
        const daysSinceCreation = (now.getTime() - applicationCreatedAt.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceCreation > 30) {
            console.log(`User ${userId} hit $750 but took ${daysSinceCreation.toFixed(1)} days (> 30 days). No bonus awarded.`);
            return;
        }

        let bonusAmount = 50.00;
        let speedBonusAwarded = false;
        let speedBonusAmount = 0;

        if (daysSinceCreation <= 14) {
            speedBonusAwarded = true;
            speedBonusAmount = 25.00;
            bonusAmount += speedBonusAmount;
            console.log(`Speed bonus! User ${userId} hit $750 in ${daysSinceCreation.toFixed(1)} days`);
        } else {
            console.log(`User ${userId} hit $750 in ${daysSinceCreation.toFixed(1)} days (base bonus only)`);
        }

        console.log(`Awarding $${bonusAmount} cash bonus to user ${referral.user_id} (base: $50, speed: $${speedBonusAmount})`);

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

        await supabase
            .from('referrals')
            .update({
                total_bonus_earned: referral.total_bonus_earned + bonusAmount
            })
            .eq('id', referral.id);
    }
};
