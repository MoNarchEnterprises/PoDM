import supabase from '../config/supabaseClient';
import { DEFAULT_COMMISSION_RATE } from '../../lib/constants';
import {
    CommissionTierInfo,
    getEffectiveCommissionRate,
    resolveCommissionTierInfo,
} from './commission.utils';

/**
 * Calculates rolling 30-day gross revenue in cents for a creator across Cleared transactions.
 */
export const getCreatorMonthlyVolumeCents = async (creatorId: string): Promise<number> => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('creator_id', creatorId)
        .eq('status', 'Cleared')
        .gte('created_at', thirtyDaysAgo);

    if (error || !data) {
        if (error) {
            console.error('[FeeUtils] Failed to fetch 30-day volume for creator:', creatorId, error.message);
        }
        return 0;
    }

    return data.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
};

/**
 * Get platform fee percentage for a creator.
 * Enclave members are locked at ENCLAVE_COMMISSION_RATE (10%);
 * explicit per-profile commission_rate is used if configured;
 * otherwise standard creators are evaluated against their rolling 30-day earnings:
 * - $0 – $5,000 / mo   -> 15.0%
 * - $5,000 – $10,000 / mo -> 12.5%
 * - $10,000+ / mo      -> 10.0%
 */
export const getCommissionRateForCreator = async (creatorId: string): Promise<number> => {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('commission_rate, is_enclave_member')
        .eq('id', creatorId)
        .single();

    if (error) {
        console.error('[FeeUtils] Failed to fetch commission_rate:', error.message);
        return DEFAULT_COMMISSION_RATE;
    }

    if (profile?.is_enclave_member) {
        return getEffectiveCommissionRate(profile, 0);
    }

    if (profile?.commission_rate != null) {
        return getEffectiveCommissionRate(profile, 0);
    }

    const monthlyVolumeCents = await getCreatorMonthlyVolumeCents(creatorId);
    return getEffectiveCommissionRate(profile, monthlyVolumeCents);
};

/**
 * Retrieves full commission tier metadata (current rate, tier name, volume, distance to next tier) for a creator.
 */
export const getCreatorCommissionTierInfo = async (creatorId: string): Promise<CommissionTierInfo> => {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('commission_rate, is_enclave_member')
        .eq('id', creatorId)
        .single();

    if (error) {
        console.error('[FeeUtils] Failed to fetch profile for tier info:', error.message);
        return resolveCommissionTierInfo(null, 0);
    }

    const monthlyVolumeCents = await getCreatorMonthlyVolumeCents(creatorId);
    return resolveCommissionTierInfo(profile, monthlyVolumeCents);
};