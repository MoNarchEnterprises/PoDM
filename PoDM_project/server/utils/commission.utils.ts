import { DEFAULT_COMMISSION_RATE, ENCLAVE_COMMISSION_RATE } from '../../lib/constants';

export interface CommissionProfile {
    is_enclave_member?: boolean | null;
    commission_rate?: number | null;
}

/**
 * Resolves the effective platform commission rate for a creator.
 * Enclave members are locked at ENCLAVE_COMMISSION_RATE (10%);
 * otherwise the per-creator commission_rate is used, falling back
 * to DEFAULT_COMMISSION_RATE.
 * @param profile - A flat profile row (or reshaped user) with is_enclave_member and commission_rate.
 * @returns The effective commission percentage.
 */
export const getEffectiveCommissionRate = (profile: CommissionProfile | null | undefined): number => {
    if (!profile) return DEFAULT_COMMISSION_RATE;
    if (profile.is_enclave_member) return ENCLAVE_COMMISSION_RATE;
    return profile.commission_rate ?? DEFAULT_COMMISSION_RATE;
};
