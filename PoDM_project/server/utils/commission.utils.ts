import {
    DEFAULT_COMMISSION_RATE,
    TIER_2_COMMISSION_RATE,
    TIER_3_COMMISSION_RATE,
    ENCLAVE_COMMISSION_RATE,
    TIER_1_THRESHOLD_CENTS,
    TIER_2_THRESHOLD_CENTS,
} from '../../lib/constants';

export interface CommissionProfile {
    is_enclave_member?: boolean | null;
    commission_rate?: number | null;
}

export type CommissionTierName = 'Tier 1 ($0–$5k)' | 'Tier 2 ($5k–$10k)' | 'Tier 3 ($10k+)' | 'The Enclave' | 'Custom Override';

export interface CommissionTierInfo {
    rate: number;
    tierName: CommissionTierName;
    monthlyVolumeCents: number;
    nextTierThresholdCents: number | null;
    distanceToNextTierCents: number | null;
    nextTierRate: number | null;
}

/**
 * Resolves standard tiered commission rate based on rolling 30-day gross revenue in cents:
 * - $0 – $5,000 / mo   -> 15.0% (Keep 85.0%)
 * - $5,000 – $10,000 / mo -> 12.5% (Keep 87.5%)
 * - $10,000+ / mo      -> 10.0% (Keep 90.0%)
 */
export const resolveStandardTierRate = (monthlyVolumeCents: number = 0): number => {
    if (monthlyVolumeCents >= TIER_2_THRESHOLD_CENTS) {
        return TIER_3_COMMISSION_RATE; // 10.0%
    }
    if (monthlyVolumeCents >= TIER_1_THRESHOLD_CENTS) {
        return TIER_2_COMMISSION_RATE; // 12.5%
    }
    return DEFAULT_COMMISSION_RATE; // 15.0%
};

/**
 * Resolves the effective platform commission rate for a creator.
 * Enclave members are locked at ENCLAVE_COMMISSION_RATE (10%);
 * explicit per-creator commission_rate overrides are respected if set;
 * otherwise standard monthly volume-based tiering applies ($0-$5k: 15%, $5k-$10k: 12.5%, $10k+: 10%).
 * @param profile - A flat profile row (or reshaped user) with is_enclave_member and commission_rate.
 * @param monthlyVolumeCents - Rolling 30-day gross revenue in cents (defaults to 0).
 * @returns The effective commission percentage.
 */
export const getEffectiveCommissionRate = (
    profile: CommissionProfile | null | undefined,
    monthlyVolumeCents: number = 0
): number => {
    if (!profile) return resolveStandardTierRate(monthlyVolumeCents);
    if (profile.is_enclave_member) return ENCLAVE_COMMISSION_RATE;
    if (profile.commission_rate != null) return profile.commission_rate;
    return resolveStandardTierRate(monthlyVolumeCents);
};

/**
 * Resolves detailed tier metadata for a creator.
 */
export const resolveCommissionTierInfo = (
    profile: CommissionProfile | null | undefined,
    monthlyVolumeCents: number = 0
): CommissionTierInfo => {
    const volume = Math.max(0, monthlyVolumeCents);

    if (profile?.is_enclave_member) {
        return {
            rate: ENCLAVE_COMMISSION_RATE,
            tierName: 'The Enclave',
            monthlyVolumeCents: volume,
            nextTierThresholdCents: null,
            distanceToNextTierCents: null,
            nextTierRate: null,
        };
    }

    if (profile?.commission_rate != null) {
        return {
            rate: profile.commission_rate,
            tierName: 'Custom Override',
            monthlyVolumeCents: volume,
            nextTierThresholdCents: null,
            distanceToNextTierCents: null,
            nextTierRate: null,
        };
    }

    if (volume >= TIER_2_THRESHOLD_CENTS) {
        return {
            rate: TIER_3_COMMISSION_RATE,
            tierName: 'Tier 3 ($10k+)',
            monthlyVolumeCents: volume,
            nextTierThresholdCents: null,
            distanceToNextTierCents: null,
            nextTierRate: null,
        };
    }

    if (volume >= TIER_1_THRESHOLD_CENTS) {
        return {
            rate: TIER_2_COMMISSION_RATE,
            tierName: 'Tier 2 ($5k–$10k)',
            monthlyVolumeCents: volume,
            nextTierThresholdCents: TIER_2_THRESHOLD_CENTS,
            distanceToNextTierCents: Math.max(0, TIER_2_THRESHOLD_CENTS - volume),
            nextTierRate: TIER_3_COMMISSION_RATE,
        };
    }

    return {
        rate: DEFAULT_COMMISSION_RATE,
        tierName: 'Tier 1 ($0–$5k)',
        monthlyVolumeCents: volume,
        nextTierThresholdCents: TIER_1_THRESHOLD_CENTS,
        distanceToNextTierCents: Math.max(0, TIER_1_THRESHOLD_CENTS - volume),
        nextTierRate: TIER_2_COMMISSION_RATE,
    };
};
