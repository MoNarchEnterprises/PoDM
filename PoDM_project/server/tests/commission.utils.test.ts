import { getEffectiveCommissionRate } from '../utils/commission.utils';
import { DEFAULT_COMMISSION_RATE, ENCLAVE_COMMISSION_RATE } from '../../lib/constants';

describe('getEffectiveCommissionRate', () => {
    it('should return ENCLAVE_COMMISSION_RATE for Enclave members with no commission_rate', () => {
        expect(getEffectiveCommissionRate({ is_enclave_member: true, commission_rate: null })).toBe(ENCLAVE_COMMISSION_RATE);
    });

    it('should return ENCLAVE_COMMISSION_RATE for Enclave members even when commission_rate is set', () => {
        expect(getEffectiveCommissionRate({ is_enclave_member: true, commission_rate: 20 })).toBe(ENCLAVE_COMMISSION_RATE);
    });

    it('should use commission_rate for non-Enclave creators', () => {
        expect(getEffectiveCommissionRate({ is_enclave_member: false, commission_rate: 15 })).toBe(15);
    });

    it('should fall back to DEFAULT_COMMISSION_RATE for non-Enclave creators without commission_rate', () => {
        expect(getEffectiveCommissionRate({ is_enclave_member: false, commission_rate: null })).toBe(DEFAULT_COMMISSION_RATE);
    });

    it('should fall back to DEFAULT_COMMISSION_RATE when profile is missing', () => {
        expect(getEffectiveCommissionRate(null)).toBe(DEFAULT_COMMISSION_RATE);
        expect(getEffectiveCommissionRate(undefined)).toBe(DEFAULT_COMMISSION_RATE);
    });
});
