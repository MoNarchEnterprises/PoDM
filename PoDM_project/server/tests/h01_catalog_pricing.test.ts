import express from 'express';
import { createServer, Server } from 'http';
import supabase from '../config/supabaseClient';
import { assertCatalogPrice } from '../services/paymentCatalog.service';
import { registerPaymentIntent } from '../services/cryptoPayment.service';
import { createSubscriptionForUser } from '../services/subscription.service';
import * as TransactionModel from '../models/transaction.model';
import * as UserModel from '../models/user.model';
import cryptoPaymentRouter from '../routes/cryptoPayment.routes';
import { errorHandler } from '../middleware/error.middleware';

jest.mock('../config/supabaseClient', () => ({
    __esModule: true,
    default: {
        from: jest.fn(),
    },
}));

jest.mock('../middleware/auth.middleware', () => ({
    protect: (req: any, _res: any, next: any) => {
        req.user = { id: 'fan-1', role: 'fan' };
        next();
    },
}));

jest.mock('../models/transaction.model');
jest.mock('../models/user.model');
jest.mock('../models/subscription.model');

const mockedSupabase = supabase as any;
const mockedTransactionModel = TransactionModel as jest.Mocked<typeof TransactionModel>;
const mockedUserModel = UserModel as jest.Mocked<typeof UserModel>;

function queryResult(data: any, error: any = null) {
    const query: any = {
        select: () => query,
        insert: () => query,
        update: () => query,
        eq: () => query,
        maybeSingle: () => Promise.resolve({ data, error }),
        single: () => Promise.resolve({ data, error }),
    };
    return query;
}

describe('H-01 / V-A04 Catalog Pricing & Adversarial Verification Suite', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Phase 1 & 2: Authoritative Canonical Pricing Authority & Fail-Closed Behavior', () => {
        it('resolves canonical subscription tier price and asserts exact match', async () => {
            mockedSupabase.from.mockReturnValue(queryResult({
                creator_data: {
                    subscriptionTiers: [
                        { id: 'tier-silver', price: 9.99 },
                        { id: 'tier-gold', price: 24.99 },
                    ],
                },
            }));

            // Exact match for $9.99 (999 cents)
            await expect(assertCatalogPrice({
                creatorId: 'creator-1',
                transactionType: 'Subscription',
                relatedId: 'tier-silver',
                amountInCents: 999,
            })).resolves.toBe(999);

            // Exact match for $24.99 (2499 cents)
            await expect(assertCatalogPrice({
                creatorId: 'creator-1',
                transactionType: 'Subscription',
                relatedId: 'tier-gold',
                amountInCents: 2499,
            })).resolves.toBe(2499);
        });

        it('rejects subscription underpayment attempt (V-A04 attack: $0.01 instead of $9.99)', async () => {
            mockedSupabase.from.mockReturnValue(queryResult({
                creator_data: {
                    subscriptionTiers: [{ id: 'tier-silver', price: 9.99 }],
                },
            }));

            await expect(assertCatalogPrice({
                creatorId: 'creator-1',
                transactionType: 'Subscription',
                relatedId: 'tier-silver',
                amountInCents: 1, // $0.01
            })).rejects.toThrow('Payment amount ($0.01) does not match the catalog price ($9.99).');
        });

        it('rejects subscription when tier does not exist or profile is missing', async () => {
            mockedSupabase.from.mockReturnValue(queryResult(null, { message: 'Not found' }));

            await expect(assertCatalogPrice({
                creatorId: 'creator-nonexistent',
                transactionType: 'Subscription',
                relatedId: 'tier-silver',
                amountInCents: 999,
            })).rejects.toThrow('Creator subscription catalog could not be found.');
        });

        it('rejects subscription when tier has non-positive or invalid price', async () => {
            mockedSupabase.from.mockReturnValue(queryResult({
                creator_data: {
                    subscriptionTiers: [{ id: 'tier-free', price: 0 }],
                },
            }));

            await expect(assertCatalogPrice({
                creatorId: 'creator-1',
                transactionType: 'Subscription',
                relatedId: 'tier-free',
                amountInCents: 0,
            })).rejects.toThrow('Payment amount must be a positive whole number of cents.');
        });

        it('resolves canonical PPV content price and asserts exact match', async () => {
            mockedSupabase.from.mockReturnValue(queryResult({
                id: 'content-100',
                creator_id: 'creator-1',
                visibility: 'pay_per_view',
                price: 15.00,
            }));

            await expect(assertCatalogPrice({
                creatorId: 'creator-1',
                transactionType: 'PPV Post',
                relatedId: 'content-100',
                amountInCents: 1500,
            })).resolves.toBe(1500);
        });

        it('rejects PPV underpayment attempt (V-A04 attack: $0.01 instead of $15.00)', async () => {
            mockedSupabase.from.mockReturnValue(queryResult({
                id: 'content-100',
                creator_id: 'creator-1',
                visibility: 'pay_per_view',
                price: 15.00,
            }));

            await expect(assertCatalogPrice({
                creatorId: 'creator-1',
                transactionType: 'PPV Post',
                relatedId: 'content-100',
                amountInCents: 1, // $0.01
            })).rejects.toThrow('Payment amount ($0.01) does not match the catalog price ($15.00).');
        });

        it('rejects PPV request when content belongs to a different creator (Product/Creator substitution)', async () => {
            mockedSupabase.from.mockReturnValue(queryResult({
                id: 'content-100',
                creator_id: 'creator-legit',
                visibility: 'pay_per_view',
                price: 15.00,
            }));

            await expect(assertCatalogPrice({
                creatorId: 'attacker-creator',
                transactionType: 'PPV Post',
                relatedId: 'content-100',
                amountInCents: 1500,
            })).rejects.toThrow('Selected PPV content is invalid for this creator.');
        });

        it('rejects PPV request when content is not pay_per_view visibility', async () => {
            mockedSupabase.from.mockReturnValue(queryResult({
                id: 'content-100',
                creator_id: 'creator-1',
                visibility: 'subscribers_only',
                price: 15.00,
            }));

            await expect(assertCatalogPrice({
                creatorId: 'creator-1',
                transactionType: 'PPV Post',
                relatedId: 'content-100',
                amountInCents: 1500,
            })).rejects.toThrow('Selected PPV content is invalid for this creator.');
        });

        it('rejects missing or null relatedId for catalog items', async () => {
            await expect(assertCatalogPrice({
                creatorId: 'creator-1',
                transactionType: 'PPV Post',
                relatedId: undefined,
                amountInCents: 500,
            })).rejects.toThrow('A catalog identifier is required for this payment type.');

            await expect(assertCatalogPrice({
                creatorId: 'creator-1',
                transactionType: 'Subscription',
                relatedId: '',
                amountInCents: 500,
            })).rejects.toThrow('A catalog identifier is required for this payment type.');
        });

        it('enforces positive whole number of cents for Tips and catalog payments', async () => {
            await expect(assertCatalogPrice({
                creatorId: 'creator-1',
                transactionType: 'Tip',
                amountInCents: -500,
            })).rejects.toThrow('Payment amount must be a positive whole number of cents.');

            await expect(assertCatalogPrice({
                creatorId: 'creator-1',
                transactionType: 'Tip',
                amountInCents: 0,
            })).rejects.toThrow('Payment amount must be a positive whole number of cents.');

            await expect(assertCatalogPrice({
                creatorId: 'creator-1',
                transactionType: 'Tip',
                amountInCents: 12.5 as any, // floating point cents
            })).rejects.toThrow('Payment amount must be a positive whole number of cents.');
        });
    });

    describe('Phase 3: Payment Intent Registration Pricing Integrity', () => {
        it('rejects payment intent registration with manipulated underpayment amount', async () => {
            mockedSupabase.from.mockReturnValue(queryResult({
                id: 'content-ppv-1',
                creator_id: 'creator-1',
                visibility: 'pay_per_view',
                price: 20.00,
            }));

            await expect(registerPaymentIntent({
                clientIntentId: 'client-intent-123',
                fanId: 'fan-1',
                creatorId: 'creator-1',
                amountInCents: 1, // $0.01 instead of $20.00
                transactionType: 'PPV Post',
                relatedId: 'content-ppv-1',
            })).rejects.toThrow('Payment amount ($0.01) does not match the catalog price ($20.00).');
        });

        it('registers payment intent with authoritative catalog price snapshot', async () => {
            mockedSupabase.from.mockImplementation((table: string) => {
                if (table === 'content') {
                    return queryResult({
                        id: 'content-ppv-1',
                        creator_id: 'creator-1',
                        visibility: 'pay_per_view',
                        price: 20.00,
                    });
                }
                if (table === 'payment_intents') {
                    return queryResult({
                        id: 'intent-uuid-1',
                        client_intent_id: 'client-intent-123',
                        status: 'pending',
                    });
                }
                if (table === 'catalog_price_snapshots') {
                    return queryResult({ id: 'snapshot-uuid-1' });
                }
                return queryResult(null);
            });

            const result = await registerPaymentIntent({
                clientIntentId: 'client-intent-123',
                fanId: 'fan-1',
                creatorId: 'creator-1',
                amountInCents: 2000,
                transactionType: 'PPV Post',
                relatedId: 'content-ppv-1',
            });

            expect(result.intentId).toBe('intent-uuid-1');
            expect(result.status).toBe('pending');
        });
    });

    describe('Phase 4: HTTP /verify Endpoint Adversarial Tests', () => {
        let server: Server;
        let port: number;

        beforeAll(async () => {
            const app = express();
            app.use(express.json());
            app.use('/api/v1/payments/crypto', cryptoPaymentRouter);
            app.use(errorHandler);
            server = createServer(app);
            await new Promise<void>(resolve => server.listen(0, resolve));
            port = (server.address() as any).port;
        });

        afterAll(async () => {
            await new Promise<void>(resolve => server.close(() => resolve()));
        });

        it('rejects POST /verify when client attempts $0.01 PPV purchase against $10.00 catalog item', async () => {
            mockedSupabase.from.mockImplementation((table: string) => {
                if (table === 'content') {
                    return queryResult({
                        id: 'content-10',
                        creator_id: 'creator-1',
                        visibility: 'pay_per_view',
                        price: 10.00,
                    });
                }
                return queryResult(null);
            });

            const response = await fetch(`http://127.0.0.1:${port}/api/v1/payments/crypto/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                    creatorId: 'creator-1',
                    amountInCents: 1, // $0.01
                    transactionType: 'PPV Post',
                    relatedId: 'content-10',
                }),
            });

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.message).toContain('does not match the catalog price');
        });

        it('rejects POST /verify when client attempts $0.01 Subscription purchase against $15.00 tier', async () => {
            mockedSupabase.from.mockImplementation((table: string) => {
                if (table === 'profiles') {
                    return queryResult({
                        creator_data: {
                            subscriptionTiers: [{ id: 'tier-vip', price: 15.00 }],
                        },
                    });
                }
                return queryResult(null);
            });

            const response = await fetch(`http://127.0.0.1:${port}/api/v1/payments/crypto/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                    creatorId: 'creator-1',
                    amountInCents: 1, // $0.01
                    transactionType: 'Subscription',
                    relatedId: 'tier-vip',
                }),
            });

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.message).toContain('does not match the catalog price');
        });
    });

    describe('Phase 5: Defense-in-Depth Tier Reuse & Amount Matching in Subscription Service', () => {
        it('rejects createSubscriptionForUser when existing Cleared tx amount does not equal tier price', async () => {
            mockedUserModel.findUserById.mockResolvedValue({
                id: 'creator-1',
                creator_data: {
                    subscriptionTiers: [{ id: 'tier-vip', price: 50.00 }], // $50.00 = 5000 cents
                },
            } as any);

            // Simulate that an existing Cleared transaction exists in DB with amount = 500 cents ($5.00)
            mockedTransactionModel.findClearedSubscriptionByTxHash.mockResolvedValue({
                id: 'tx-1',
                amount: 500, // $5.00
                blockchain_tx_hash: '0x1111111111111111111111111111111111111111111111111111111111111111',
                fan_id: 'fan-1',
                creator_id: 'creator-1',
                status: 'Cleared',
                type: 'Subscription',
            } as any);

            await expect(createSubscriptionForUser(
                'fan-1',
                'creator-1',
                'tier-vip',
                '0x1111111111111111111111111111111111111111111111111111111111111111'
            )).rejects.toThrow('Transaction payment amount ($5.00) does not match the subscription tier price ($50.00).');
        });
    });
});
