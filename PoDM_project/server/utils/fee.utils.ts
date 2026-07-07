import supabase from '../config/supabaseClient';
import { DEFAULT_COMMISSION_RATE } from '../../lib/constants';

/**
 * Get platform fee percentage for a creator.
 * Uses the creator's per-profile commission_rate if set,
 * otherwise falls back to the DEFAULT_COMMISSION_RATE.
 */
export const getCommissionRateForCreator = async (creatorId: string): Promise<number> => {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('commission_rate')
        .eq('id', creatorId)
        .single();

    if (error) {
        console.error('[FeeUtils] Failed to fetch commission_rate:', error.message);
        return DEFAULT_COMMISSION_RATE;
    }

    return profile?.commission_rate ?? DEFAULT_COMMISSION_RATE;
};

/**
 * Calculate platform fee amount in cents
 * @param amountInCents - Transaction amount in cents
 * @param feePercentage - Platform fee percentage (e.g., 15 for 15%)
 * @returns Platform fee in cents
 */
export const calculatePlatformFee = (amountInCents: number, feePercentage: number): number => {
    return Math.round(amountInCents * (feePercentage / 100));
};
