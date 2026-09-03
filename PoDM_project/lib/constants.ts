// server/lib/constants.ts
export const DEFAULT_COMMISSION_RATE = 15; // Tier 1 base starting rate ($0 - $5,000/mo)
export const TIER_2_COMMISSION_RATE = 12.5; // Tier 2 rate ($5,000 - $10,000/mo)
export const TIER_3_COMMISSION_RATE = 10; // Tier 3 rate ($10,000+/mo)
export const ENCLAVE_COMMISSION_RATE = 10; // Fixed Enclave rate (first 50 creators)
export const REFERRAL_FEE_BPS = 100;

export const TIER_1_THRESHOLD_CENTS = 500_000; // $5,000.00 in cents
export const TIER_2_THRESHOLD_CENTS = 1_000_000; // $10,000.00 in cents