import * as SubscriptionModel from '../models/subscription.model';
import * as TransactionModel from '../models/transaction.model';
import * as contractUtils from '../utils/contract.utils';

jest.mock('../config/supabaseClient', () => ({
    __esModule: true,
    default: {
        from: jest.fn(),
        rpc: jest.fn(),
    },
}));
jest.mock('../models/subscription.model', () => ({
    findSubscriptionsPendingRenewal: jest.fn(),
    findSubscriptionsDueForRenewal: jest.fn(),
    claimSubscriptionRenewal: jest.fn(),
    updateClaimedRenewal: jest.fn(),
    markRenewalPending: jest.fn(),
    completeRenewal: jest.fn(),
    clearRenewalPending: jest.fn(),
}));
jest.mock('../models/transaction.model', () => ({
    findTransactionByBlockchainTxHash: jest.fn(),
    createTransaction: jest.fn(),
}));
jest.mock('../utils/fee.utils', () => ({
    getCommissionRateForCreator: jest.fn(() => Promise.resolve(12.5)),
}));
jest.mock('../services/referral.service', () => ({
    getReferrerWalletForCreator: jest.fn(() => Promise.resolve(null)),
    calculateReferralFee: jest.fn(() => Promise.resolve({ referralFee: 0, referrerId: null })),
    recordReferralFee: jest.fn(),
}));
jest.mock('../utils/contract.utils', () => ({
    getContractConfig: jest.fn(),
    getChainId: jest.fn(() => 84532),
    encodeProcessRenewal: jest.fn(() => '0xdeadbeef'),
}));

const RENEWAL_TOPIC = '0x' + 'ab'.repeat(32);
const CONTRACT_ADDR = '0x1111111111111111111111111111111111111111';
const FAN_ADDR = '0x2222222222222222222222222222222222222222';
const CREATOR_ADDR = '0x3333333333333333333333333333333333333333';
const FAN_PADDED = '0x' + '00'.repeat(12) + FAN_ADDR.slice(2);
const CREATOR_PADDED = '0x' + '00'.repeat(12) + CREATOR_ADDR.slice(2);
const DEFAULT_RENEWAL_ID_HASH = '0x' + '99'.repeat(32);

const mockReceipts: Record<string, any> = {};
const mockTxHashes: string[] = [];
let mockSendTransactionFail = false;

jest.mock('ethers', () => ({
    __esModule: true,
    ethers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => ({
            getTransactionReceipt: jest.fn((hash: string) => {
                if (mockReceipts[hash] !== undefined) return Promise.resolve(mockReceipts[hash]);
                // Broadcast hashes (0xcd…) auto-return a valid verified receipt so the
                // happy path can pass verification immediately (mirrors the live flow).
                if (hash && hash.startsWith('0xcd')) return Promise.resolve({ status: 1, blockNumber: 99, logs: [mockValidLog()] });
                return Promise.resolve(null);
            }),
            getBlockNumber: jest.fn(() => Promise.resolve(100)),
            destroy: jest.fn(() => Promise.resolve()),
        })),
        Wallet: jest.fn().mockImplementation(() => ({
            sendTransaction: jest.fn(() => {
                if (mockSendTransactionFail) return Promise.reject(new Error('broadcast failed'));
                const hash = '0x' + 'cd'.repeat(32) + mockTxHashes.length.toString(16).padStart(2, '0');
                mockTxHashes.push(hash);
                return Promise.resolve({ hash });
            }),
        })),
        id: jest.fn((input: string) => {
            if (input === 'SubscriptionRenewed(bytes32,address,address,uint256,uint256)') return RENEWAL_TOPIC;
            if (input.startsWith('renewal:')) return DEFAULT_RENEWAL_ID_HASH;
            return '0x' + '00'.repeat(32);
        }),
    },
}));

const mockedSubscriptionModel = SubscriptionModel as any;
const mockedTxModel = TransactionModel as any;
const mockedContractUtils = contractUtils as any;

const contractConfig = { contractAddress: CONTRACT_ADDR, rpcUrl: 'http://localhost:8545', usdcAddress: '0x', chainId: 84532, isProd: false };

function mockValidLog(renewalIdHash: string = DEFAULT_RENEWAL_ID_HASH) {
    return {
        address: CONTRACT_ADDR.toLowerCase(),
        topics: [RENEWAL_TOPIC, renewalIdHash, FAN_PADDED, CREATOR_PADDED],
        data: '0x' + (9_990_000).toString(16).padStart(64, '0'), // $9.99 in micro-USDC
    };
}

function mockSub(overrides: Record<string, any> = {}) {
    return {
        id: 'sub-1',
        fan_id: 'fan-uuid',
        creator_id: 'creator-uuid',
        fan_wallet_address: FAN_ADDR,
        price: 999,
        renewal_pending_tx_hash: null,
        renewal_status: 'PENDING',
        renewal_id: 'renewal:sub-1:2026-08-01T00:00:00.000Z',
        renewal_period: '2026-08-01T00:00:00.000Z',
        next_billing_date: '2026-08-01T00:00:00.000Z',
        renewal_attempts: 0,
        renewal_locked_at: null,
        created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        ...overrides,
    };
}

function mockProfiles() {
    const supabase = require('../config/supabaseClient').default as any;
    supabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
            return {
                select: jest.fn(() => ({
                    eq: jest.fn(() => ({
                        single: jest.fn(() => Promise.resolve({ data: { crypto_wallet_address: CREATOR_ADDR }, error: null })),
                    })),
                })),
            };
        }
        if (table === 'transactions') {
            return {
                select: jest.fn(() => ({
                    eq: jest.fn(() => ({
                        maybeSingle: jest.fn(() => Promise.resolve({ data: null })),
                    })),
                })),
            };
        }
        return { select: jest.fn(), eq: jest.fn(), single: jest.fn(), update: jest.fn(), insert: jest.fn() };
    });
}

let job: typeof import('../jobs/renewSubscriptions');

function loadJob() {
    process.env.KEEPER_PRIVATE_KEY = '0x' + 'ab'.repeat(32);
    process.env.BASE_MIN_CONFIRMATIONS = '1';
    process.env.RENEWAL_NO_RECEIPT_RELEASE_MS = '3600000';
    jest.isolateModules(() => {
        job = require('../jobs/renewSubscriptions');
    });
}

describe('renewSubscriptions renewal state machine (H-04)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (mockedContractUtils.getContractConfig as jest.Mock).mockReturnValue(contractConfig);
        Object.keys(mockReceipts).forEach(k => delete mockReceipts[k]);
        mockTxHashes.length = 0;
        mockSendTransactionFail = false;
        mockProfiles();
    });

    describe('Deterministic Identity & Hash Helpers', () => {
        it('computes deterministic renewal identity matching subscription and period', () => {
            loadJob();
            const renewalId = job.computeRenewalId('123', '2026-09-01T00:00:00Z');
            expect(renewalId).toBe('renewal:123:2026-09-01T00:00:00Z');

            const hash = job.computeRenewalIdHash(renewalId);
            expect(hash).toBeDefined();
        });
    });

    describe('reconcilePendingRenewals — crash recovery', () => {
        it('completes a stored hash when the receipt succeeded on-chain (worker crashed after broadcast)', async () => {
            loadJob();
            (mockedSubscriptionModel.findSubscriptionsPendingRenewal as jest.Mock).mockResolvedValue([
                mockSub({ id: 'sub-crash', renewal_pending_tx_hash: '0xcrash', fan_id: 'fan-uuid', creator_id: 'creator-uuid' }),
            ]);
            mockReceipts['0xcrash'] = { status: 1, blockNumber: 99, logs: [mockValidLog()] };
            (mockedTxModel.findTransactionByBlockchainTxHash as jest.Mock).mockResolvedValue(null);
            (mockedTxModel.createTransaction as jest.Mock).mockResolvedValue({ id: 1 });
            (mockedSubscriptionModel.completeRenewal as jest.Mock).mockResolvedValue({});

            await job.reconcilePendingRenewals();

            expect(mockedTxModel.createTransaction).toHaveBeenCalledWith(expect.objectContaining({
                type: 'SubscriptionRenewal',
                status: 'Cleared',
                blockchain_tx_hash: '0xcrash',
                renewal_id: 'renewal:sub-1:2026-08-01T00:00:00.000Z',
                payment_method: 'crypto',
                payment_currency: 'USDC',
                chain_id: 84532,
            }));
            expect(mockedSubscriptionModel.completeRenewal).toHaveBeenCalledWith('sub-crash', expect.any(String));
            expect(mockedSubscriptionModel.clearRenewalPending).not.toHaveBeenCalled();
        });

        it('does not create a duplicate transaction row when one already exists for the hash', async () => {
            loadJob();
            (mockedSubscriptionModel.findSubscriptionsPendingRenewal as jest.Mock).mockResolvedValue([
                mockSub({ id: 'sub-dup', renewal_pending_tx_hash: '0xdup', fan_id: 'fan-uuid', creator_id: 'creator-uuid' }),
            ]);
            mockReceipts['0xdup'] = { status: 1, blockNumber: 99, logs: [mockValidLog()] };
            (mockedTxModel.findTransactionByBlockchainTxHash as jest.Mock).mockResolvedValue({ id: 42 });

            await job.reconcilePendingRenewals();

            expect(mockedTxModel.createTransaction).not.toHaveBeenCalled();
            expect(mockedSubscriptionModel.completeRenewal).toHaveBeenCalledWith('sub-dup', expect.any(String));
        });

        it('clears a stored hash when the on-chain tx reverted (status 0) so it can retry safely', async () => {
            loadJob();
            (mockedSubscriptionModel.findSubscriptionsPendingRenewal as jest.Mock).mockResolvedValue([
                mockSub({ id: 'sub-revert', renewal_pending_tx_hash: '0xrevert', fan_id: 'fan-uuid', creator_id: 'creator-uuid' }),
            ]);
            mockReceipts['0xrevert'] = { status: 0, blockNumber: 99 };

            await job.reconcilePendingRenewals();

            expect(mockedSubscriptionModel.clearRenewalPending).toHaveBeenCalledWith('sub-revert', expect.stringContaining('reverted'));
            expect(mockedSubscriptionModel.completeRenewal).not.toHaveBeenCalled();
            expect(mockedTxModel.createTransaction).not.toHaveBeenCalled();
        });

        it('defers a hash with no receipt yet (never releases a tx that might still mine)', async () => {
            loadJob();
            (mockedSubscriptionModel.findSubscriptionsPendingRenewal as jest.Mock).mockResolvedValue([
                mockSub({ id: 'sub-defer', renewal_pending_tx_hash: '0xnodefer', created_at: new Date(Date.now() - 60 * 1000).toISOString() }),
            ]);
            mockReceipts['0xnodefer'] = null;

            await job.reconcilePendingRenewals();

            expect(mockedSubscriptionModel.clearRenewalPending).not.toHaveBeenCalled();
            expect(mockedSubscriptionModel.completeRenewal).not.toHaveBeenCalled();
        });

        it('clears a hash with no receipt after the no-receipt release window (never mined)', async () => {
            loadJob();
            process.env.RENEWAL_NO_RECEIPT_RELEASE_MS = '1000';
            (mockedSubscriptionModel.findSubscriptionsPendingRenewal as jest.Mock).mockResolvedValue([
                mockSub({ id: 'sub-stale', renewal_pending_tx_hash: '0xstale', renewal_started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() }),
            ]);
            mockReceipts['0xstale'] = null;

            await job.reconcilePendingRenewals();

            expect(mockedSubscriptionModel.clearRenewalPending).toHaveBeenCalledWith('sub-stale', expect.stringContaining('timed out'));
            delete process.env.RENEWAL_NO_RECEIPT_RELEASE_MS;
        });

        it('never re-broadcasts during reconciliation (a crash never causes a double charge)', async () => {
            loadJob();
            (mockedSubscriptionModel.findSubscriptionsPendingRenewal as jest.Mock).mockResolvedValue([
                mockSub({ id: 'sub-crash', renewal_pending_tx_hash: '0xcrash', fan_id: 'fan-uuid', creator_id: 'creator-uuid' }),
            ]);
            mockReceipts['0xcrash'] = { status: 1, blockNumber: 99, logs: [mockValidLog()] };
            (mockedTxModel.findTransactionByBlockchainTxHash as jest.Mock).mockResolvedValue(null);
            (mockedTxModel.createTransaction as jest.Mock).mockResolvedValue({ id: 1 });
            (mockedSubscriptionModel.completeRenewal as jest.Mock).mockResolvedValue({});

            await job.reconcilePendingRenewals();

            expect(mockTxHashes).toHaveLength(0);
        });
    });

    describe('renewSubscriptions — due renewal happy path & claim contention', () => {
        it('records the pending hash before waiting, then finalizes with deterministic renewalId', async () => {
            loadJob();
            (mockedSubscriptionModel.findSubscriptionsPendingRenewal as jest.Mock).mockResolvedValue([]);
            (mockedSubscriptionModel.findSubscriptionsDueForRenewal as jest.Mock).mockResolvedValue([
                mockSub({ id: 'sub-due', fan_id: 'fan-uuid', creator_id: 'creator-uuid', next_billing_date: '2026-08-17T00:00:00Z' }),
            ]);
            (mockedSubscriptionModel.claimSubscriptionRenewal as jest.Mock).mockResolvedValue(true);
            (mockedSubscriptionModel.markRenewalPending as jest.Mock).mockResolvedValue(true);
            (mockedTxModel.findTransactionByBlockchainTxHash as jest.Mock).mockResolvedValue(null);
            (mockedTxModel.createTransaction as jest.Mock).mockResolvedValue({ id: 9 });

            await job.renewSubscriptions();

            const broadcastHash = mockTxHashes[0];
            expect(mockedSubscriptionModel.claimSubscriptionRenewal).toHaveBeenCalledWith(
                'sub-due',
                expect.any(String),
                'renewal:sub-due:2026-08-17T00:00:00Z',
                '2026-08-17T00:00:00Z'
            );
            expect(mockedSubscriptionModel.markRenewalPending).toHaveBeenCalledWith('sub-due', expect.any(String), broadcastHash);
            expect(mockedSubscriptionModel.completeRenewal).toHaveBeenCalledWith('sub-due', expect.any(String));
        });

        it('skips a due subscription already claimed by another worker (worker B rejected)', async () => {
            loadJob();
            (mockedSubscriptionModel.findSubscriptionsPendingRenewal as jest.Mock).mockResolvedValue([]);
            (mockedSubscriptionModel.findSubscriptionsDueForRenewal as jest.Mock).mockResolvedValue([
                mockSub({ id: 'sub-contested', fan_id: 'fan-uuid', creator_id: 'creator-uuid' }),
            ]);
            (mockedSubscriptionModel.claimSubscriptionRenewal as jest.Mock).mockResolvedValue(false);

            await job.renewSubscriptions();

            expect(mockTxHashes).toHaveLength(0);
            expect(mockedSubscriptionModel.markRenewalPending).not.toHaveBeenCalled();
            expect(mockedSubscriptionModel.completeRenewal).not.toHaveBeenCalled();
        });

        it('locks content + increments attempts when the broadcast itself fails (nothing was sent)', async () => {
            loadJob();
            (mockedSubscriptionModel.findSubscriptionsPendingRenewal as jest.Mock).mockResolvedValue([]);
            (mockedSubscriptionModel.findSubscriptionsDueForRenewal as jest.Mock).mockResolvedValue([
                mockSub({ id: 'sub-fail', fan_id: 'fan-uuid', creator_id: 'creator-uuid', renewal_attempts: 0 }),
            ]);
            (mockedSubscriptionModel.claimSubscriptionRenewal as jest.Mock).mockResolvedValue(true);
            mockSendTransactionFail = true;

            await job.renewSubscriptions();

            expect(mockedSubscriptionModel.updateClaimedRenewal).toHaveBeenCalledWith(
                'sub-fail', expect.any(String),
                expect.objectContaining({ renewal_attempts: 1 })
            );
            mockSendTransactionFail = false;
        });

        it('concurrent worker invocations produce at most 1 charge per renewal period', async () => {
            loadJob();
            (mockedSubscriptionModel.findSubscriptionsPendingRenewal as jest.Mock).mockResolvedValue([]);
            (mockedSubscriptionModel.findSubscriptionsDueForRenewal as jest.Mock).mockResolvedValue([
                mockSub({ id: 'sub-race', fan_id: 'fan-uuid', creator_id: 'creator-uuid' }),
            ]);

            // Worker 1 claims successfully, Worker 2 claim rejected
            (mockedSubscriptionModel.claimSubscriptionRenewal as jest.Mock)
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);
            (mockedSubscriptionModel.markRenewalPending as jest.Mock).mockResolvedValue(true);
            (mockedTxModel.findTransactionByBlockchainTxHash as jest.Mock).mockResolvedValue(null);
            (mockedTxModel.createTransaction as jest.Mock).mockResolvedValue({ id: 10 });

            // Run concurrently
            await Promise.all([
                job.renewSubscriptions(),
                job.renewSubscriptions(),
            ]);

            expect(mockTxHashes).toHaveLength(1);
        });
    });
});