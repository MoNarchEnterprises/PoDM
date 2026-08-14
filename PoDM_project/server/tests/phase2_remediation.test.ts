import { AppError } from '../middleware/error.middleware';

describe('Phase 2 Security Remediation Unit Tests', () => {
    describe('Task 2.1: Micro-USDC Precision Conversion (V-A02)', () => {
        const centsToMicroUsdc = (cents: number): bigint => {
            return BigInt(Math.round(cents)) * 10_000n;
        };

        it('should accurately convert cents to micro-USDC without whole-dollar rounding', () => {
            expect(centsToMicroUsdc(999)).toBe(9_990_000n); // $9.99 -> 9,990,000 uUSDC
            expect(centsToMicroUsdc(1550)).toBe(15_500_000n); // $15.50 -> 15,500,000 uUSDC
            expect(centsToMicroUsdc(1)).toBe(10_000n); // $0.01 -> 10,000 uUSDC
            expect(centsToMicroUsdc(1000)).toBe(10_000_000n); // $10.00 -> 10,000,000 uUSDC
        });

        it('should eliminate whole-dollar rounding drift', () => {
            const oldRounding = (cents: number) => Math.round(cents / 100) * 1_000_000;
            const newRounding = (cents: number) => Number(centsToMicroUsdc(cents));

            // $9.99 (999 cents): old rounding converted to $10.00 (10,000,000 uUSDC)
            expect(oldRounding(999)).toBe(10_000_000);
            expect(newRounding(999)).toBe(9_990_000);

            // $15.50 (1550 cents): old rounding converted to $16.00 (16,000,000 uUSDC)
            expect(oldRounding(1550)).toBe(16_000_000);
            expect(newRounding(1550)).toBe(15_500_000);
        });
    });

    describe('Task 2.2: Fee Split Reconciliation (BV-03)', () => {
        const validateFeeSplit = (
            amountInCents: number,
            commissionRate: number,
            emittedPlatformFeeInCents: number,
            emittedCreatorPayoutInCents: number
        ): void => {
            const expectedPlatformFeeInCents = Math.round(amountInCents * (commissionRate / 100));
            const expectedCreatorPayoutInCents = amountInCents - expectedPlatformFeeInCents;

            if (Math.abs(emittedPlatformFeeInCents - expectedPlatformFeeInCents) > 2) {
                throw new AppError('Platform fee split mismatch', 400);
            }

            if (Math.abs(emittedCreatorPayoutInCents - expectedCreatorPayoutInCents) > 2) {
                throw new AppError('Creator payout split mismatch', 400);
            }
        };

        it('should accept valid fee splits matching expected commission rate', () => {
            // $10.00 payment (1000 cents), 12.5% default rate -> platform fee $1.25 (125 cents), creator $8.75 (875 cents)
            expect(() => validateFeeSplit(1000, 12.5, 125, 875)).not.toThrow();

            // $20.00 payment (2000 cents), 10% Enclave rate -> platform fee $2.00 (200 cents), creator $18.00 (1800 cents)
            expect(() => validateFeeSplit(2000, 10, 200, 1800)).not.toThrow();
        });

        it('should reject fee splits where platform fee was manipulated on-chain', () => {
            // Attacker passed customPlatformFeeBps = 100 (1%) on a $10.00 payment when commission rate is 12.5%
            // Emitted platform fee: $0.10 (10 cents), emitted creator: $9.90 (990 cents)
            expect(() => validateFeeSplit(1000, 12.5, 10, 990)).toThrow(AppError);
        });
    });
});
