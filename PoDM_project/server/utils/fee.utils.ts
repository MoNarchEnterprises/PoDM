import supabase from '../config/supabaseClient';
import { DEFAULT_COMMISSION_RATE } from '../../lib/constants';
import { getEffectiveCommissionRate } from './commission.utils';

/**
 * Get platform fee percentage for a creator.
 * Enclave members are locked at ENCLAVE_COMMISSION_RATE; otherwise the
 * creator's per-profile commission_rate is used, falling back to the
 * DEFAULT_COMMISSION_RATE.
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

    return getEffectiveCommissionRate(profile);
};