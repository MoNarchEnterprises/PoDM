import { verifyAndRecordBasePayment } from '../services/cryptoPayment.service';
import { AppError } from '../middleware/error.middleware';

describe('CryptoPaymentService verification hardening (CRITICAL-02)', () => {
    it('rejects fabricated non-hex txHash with 400 AppError', async () => {
        const input = {
            txHash: 'subscription-payment',
            fanId: 'fan-123',
            creatorId: 'creator-456',
            amountInCents: 1000,
            transactionType: 'Subscription' as const,
        };

        await expect(verifyAndRecordBasePayment(input)).rejects.toThrow(AppError);
        await expect(verifyAndRecordBasePayment(input)).rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid transaction hash format. Must be a 64-character hex string starting with 0x.',
        });
    });

    it('rejects arbitrary short string txHash with 400 AppError', async () => {
        const input = {
            txHash: 'embedded-payment',
            fanId: 'fan-123',
            creatorId: 'creator-456',
            amountInCents: 500,
            transactionType: 'Tip' as const,
        };

        await expect(verifyAndRecordBasePayment(input)).rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid transaction hash format. Must be a 64-character hex string starting with 0x.',
        });
    });
});
