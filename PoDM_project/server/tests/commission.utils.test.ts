import {
    getEffectiveCommissionRate,
    resolveStandardTierRate,
    resolveCommissionTierInfo
} from '../utils/commission.utils';
import {
    DEFAULT_COMMISSION_RATE,
    TIER_2_COMMISSION_RATE,
    TIER_3_COMMISSION_RATE,
    ENCLAVE_COMMISSION_RATE,
    TIER_1_THRESHOLD_CENTS,
    TIER_2_THRESHOLD_CENTS,
} from '../../lib/constants';

describe('commission.utils', () => {
    describe('resolveStandardTierRate', () => {
        it('should return 15% (Tier 1) for $0 earnings', () => {
            expect(resolveStandardTierRate(0)).toBe(15.0);
        });

        it('should return 15% (Tier 1) for earnings under $5,000 (e.g. $1,500 = 150,000 cents)', () => {
            expect(resolveStandardTierRate(150_000)).toBe(15.0);
            expect(resolveStandardTierRate(499_999)).toBe(15.0);
        });

        it('should return 12.5% (Tier 2) at exactly $5,000 (500,000 cents)', () => {
            expect(resolveStandardTierRate(TIER_1_THRESHOLD_CENTS)).toBe(12.5);
        });

        it('should return 12.5% (Tier 2) for earnings between $5,000 and $10,000 (e.g. $7,500 = 750,000 cents)', () => {
            expect(resolveStandardTierRate(750_000)).toBe(12.5);
            expect(resolveStandardTierRate(999_999)).toBe(12.5);
        });

        it('should return 10% (Tier 3) at exactly $10,000 (1,000,000 cents)', () => {
            expect(resolveStandardTierRate(TIER_2_THRESHOLD_CENTS)).toBe(10.0);
        });

        it('should return 10% (Tier 3) for earnings above $10,000 (e.g. $25,000 = 2,500,000 cents)', () => {
            expect(resolveStandardTierRate(2_500_000)).toBe(10.0);
        });
    });

    describe('getEffectiveCommissionRate', () => {
        it('should return ENCLAVE_COMMISSION_RATE (10%) for Enclave members regardless of volume', () => {
            expect(getEffectiveCommissionRate({ is_enclave_member: true, commission_rate: null }, 0)).toBe(ENCLAVE_COMMISSION_RATE);
            expect(getEffectiveCommissionRate({ is_enclave_member: true, commission_rate: null }, 100_000)).toBe(ENCLAVE_COMMISSION_RATE);
            expect(getEffectiveCommissionRate({ is_enclave_member: true, commission_rate: null }, 2_000_000)).toBe(ENCLAVE_COMMISSION_RATE);
        });

        it('should return ENCLAVE_COMMISSION_RATE for Enclave members even when custom commission_rate is stored', () => {
            expect(getEffectiveCommissionRate({ is_enclave_member: true, commission_rate: 20 }, 0)).toBe(ENCLAVE_COMMISSION_RATE);
        });

        it('should use explicit commission_rate override for non-Enclave creators', () => {
            expect(getEffectiveCommissionRate({ is_enclave_member: false, commission_rate: 8 }, 0)).toBe(8);
            expect(getEffectiveCommissionRate({ is_enclave_member: false, commission_rate: 18 }, 2_000_000)).toBe(18);
        });

        it('should evaluate 30-day volume tiers for standard creators with no custom rate', () => {
            expect(getEffectiveCommissionRate({ is_enclave_member: false, commission_rate: null }, 0)).toBe(DEFAULT_COMMISSION_RATE); // 15%
            expect(getEffectiveCommissionRate({ is_enclave_member: false, commission_rate: null }, 250_000)).toBe(15.0);
            expect(getEffectiveCommissionRate({ is_enclave_member: false, commission_rate: null }, 600_000)).toBe(TIER_2_COMMISSION_RATE); // 12.5%
            expect(getEffectiveCommissionRate({ is_enclave_member: false, commission_rate: null }, 1_500_000)).toBe(TIER_3_COMMISSION_RATE); // 10%
        });

        it('should evaluate volume tiers when profile is missing / null', () => {
            expect(getEffectiveCommissionRate(null, 0)).toBe(DEFAULT_COMMISSION_RATE);
            expect(getEffectiveCommissionRate(null, 500_000)).toBe(12.5);
            expect(getEffectiveCommissionRate(undefined, 1_000_000)).toBe(10.0);
        });
    });

    describe('resolveCommissionTierInfo', () => {
        it('should return Enclave metadata for enclave members', () => {
            const info = resolveCommissionTierInfo({ is_enclave_member: true }, 50_000);
            expect(info.rate).toBe(10.0);
            expect(info.tierName).toBe('The Enclave');
            expect(info.nextTierThresholdCents).toBeNull();
            expect(info.distanceToNextTierCents).toBeNull();
        });

        it('should return Custom Override metadata when commission_rate is explicitly set', () => {
            const info = resolveCommissionTierInfo({ is_enclave_member: false, commission_rate: 8.5 }, 50_000);
            expect(info.rate).toBe(8.5);
            expect(info.tierName).toBe('Custom Override');
            expect(info.nextTierThresholdCents).toBeNull();
        });

        it('should return Tier 1 metadata and distance to Tier 2 for $1,000 monthly volume', () => {
            const info = resolveCommissionTierInfo({ is_enclave_member: false, commission_rate: null }, 100_000); // $1,000
            expect(info.rate).toBe(15.0);
            expect(info.tierName).toBe('Tier 1 ($0–$5k)');
            expect(info.nextTierThresholdCents).toBe(500_000); // $5,000
            expect(info.distanceToNextTierCents).toBe(400_000); // $4,000 left
            expect(info.nextTierRate).toBe(12.5);
        });

        it('should return Tier 2 metadata and distance to Tier 3 for $6,000 monthly volume', () => {
            const info = resolveCommissionTierInfo({ is_enclave_member: false, commission_rate: null }, 600_000); // $6,000
            expect(info.rate).toBe(12.5);
            expect(info.tierName).toBe('Tier 2 ($5k–$10k)');
            expect(info.nextTierThresholdCents).toBe(1_000_000); // $10,000
            expect(info.distanceToNextTierCents).toBe(400_000); // $4,000 left
            expect(info.nextTierRate).toBe(10.0);
        });

        it('should return Tier 3 metadata for $12,000 monthly volume', () => {
            const info = resolveCommissionTierInfo({ is_enclave_member: false, commission_rate: null }, 1_200_000); // $12,000
            expect(info.rate).toBe(10.0);
            expect(info.tierName).toBe('Tier 3 ($10k+)');
            expect(info.nextTierThresholdCents).toBeNull();
            expect(info.distanceToNextTierCents).toBeNull();
            expect(info.nextTierRate).toBeNull();
        });
    });
});
