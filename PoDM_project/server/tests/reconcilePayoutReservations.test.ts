import supabase from '../config/supabaseClient';
import * as TransactionModel from '../models/transaction.model';
import * as contractUtils from '../utils/contract.utils';
import { reconcilePayoutReservations } from '../jobs/reconcilePayoutReservations';

jest.mock('../config/supabaseClient', () => ({
    __esModule: true,
    default: { from: jest.fn(), rpc: jest.fn() },
}));
jest.mock('../models/transaction.model', () => ({
    findTransactionByBlockchainTxHash: jest.fn(),
    createTransaction: jest.fn(),
}));
jest.mock('../utils/contract.utils', () => ({
    getContractConfig: jest.fn(),
    getChainId: jest.fn(() => 84532),
}));

const mockedSupabase = supabase as any;
const mockedTxModel = TransactionModel as any;

const contractConfig = { contractAddress: '0x1111111111111111111111111111111111111111', rpcUrl: 'http://localhost:8545', usdcAddress: '0x', chainId: 84532, isProd: false };

function chainQuery() {
    const query: any = { select: () => query, eq: () => query, lte: () => query, limit: () => query };
    return query;
}

function mockReservations(rows: any[]) {
    mockedSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
            eq: jest.fn(() => ({
                lte: jest.fn(() => ({
                    limit: jest.fn(() => Promise.resolve({ data: rows, error: null })),
                })),
            })),
        })),
    });
}

// Mock the ethers JsonRpcProvider used inside the job.
const mockReceipts: Record<string, any> = {};
jest.mock('ethers', () => ({
    __esModule: true,
    ethers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => ({
            getTransactionReceipt: jest.fn((hash: string) => Promise.resolve(mockReceipts[hash] ?? null)),
            getBlockNumber: jest.fn(() => Promise.resolve(1000)),
            getLogs: jest.fn(() => Promise.resolve(mockLogs)),
            destroy: jest.fn(() => Promise.resolve()),
        })),
        id: jest.fn((sig: string) => `topic:${sig}`),
        zeroPadValue: jest.fn((v: string) => v),
        Interface: class {
            static parseLog = jest.fn();
        },
    },
}));

let mockLogs: any[] = [];

describe('reconcilePayoutReservations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (contractUtils.getContractConfig as jest.Mock).mockReturnValue(contractConfig);
        (mockedSupabase.rpc as jest.Mock).mockResolvedValue({ data: true, error: null });
        Object.keys(mockReceipts).forEach(k => delete mockReceipts[k]);
        mockLogs = [];
    });

    it('does not touch fresh (in-grace) pending reservations', async () => {
        mockReservations([]); // grace cutoff filters them out in the query; job sees none
        await reconcilePayoutReservations();
        expect(mockedSupabase.rpc).not.toHaveBeenCalled();
    });

    it('completes a reservation whose tx succeeded on-chain and backfills the Payout row', async () => {
        const res = { id: 'r1', creator_id: 'c1', amount: 10000, blockchain_tx_hash: '0xabc', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() };
        mockReservations([res]);
        mockReceipts['0xabc'] = { status: 1, hash: '0xabc' };
        (mockedTxModel.findTransactionByBlockchainTxHash as jest.Mock).mockResolvedValue(null);
        (mockedTxModel.createTransaction as jest.Mock).mockResolvedValue({ id: 1 });

        await reconcilePayoutReservations();

        expect(mockedSupabase.rpc).toHaveBeenCalledWith('complete_payout_reservation', { p_reservation_id: 'r1', p_tx_hash: '0xabc' });
        expect(mockedTxModel.createTransaction).toHaveBeenCalledWith(expect.objectContaining({ type: 'Payout', amount: 10000, status: 'Cleared', blockchain_tx_hash: '0xabc', creator_payout: -10000 }));
    });

    it('releases a reservation whose tx reverted on-chain (status 0)', async () => {
        const res = { id: 'r2', creator_id: 'c2', amount: 10000, blockchain_tx_hash: '0xrevert', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() };
        mockReservations([res]);
        mockReceipts['0xrevert'] = { status: 0, hash: '0xrevert' };

        await reconcilePayoutReservations();

        expect(mockedSupabase.rpc).toHaveBeenCalledWith('release_payout_reservation', { p_reservation_id: 'r2' });
        expect(mockedSupabase.rpc).not.toHaveBeenCalledWith('complete_payout_reservation', expect.anything());
    });

    it('releases a reservation whose tx never mined after the no-receipt release window', async () => {
        const old = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
        const res = { id: 'r3', creator_id: 'c3', amount: 10000, blockchain_tx_hash: '0xnoreceipt', created_at: old };
        mockReservations([res]);
        // no receipt -> deferred; but created_at is 3h old > 1h NO_RECEIPT_RELEASE_MS -> released
        process.env.PAYOUT_RESERVATION_NO_RECEIPT_RELEASE_MS = '3600000';
        process.env.PAYOUT_RESERVATION_GRACE_MS = '60000';

        await reconcilePayoutReservations();

        expect(mockedSupabase.rpc).toHaveBeenCalledWith('release_payout_reservation', { p_reservation_id: 'r3' });
        delete process.env.PAYOUT_RESERVATION_NO_RECEIPT_RELEASE_MS;
        delete process.env.PAYOUT_RESERVATION_GRACE_MS;
    });

    it('completes a no-hash reservation via PayoutCompleted event scan and backfills the row', async () => {
        const res = { id: 'r4', creator_id: 'c4', amount: 10000, blockchain_tx_hash: null, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() };
        mockReservations([res]);
        mockLogs = [{ transactionHash: '0xevent', data: '0x' + (10000n * 10000n).toString(16).padStart(64, '0') }];
        (mockedTxModel.findTransactionByBlockchainTxHash as jest.Mock).mockResolvedValue(null);
        (mockedTxModel.createTransaction as jest.Mock).mockResolvedValue({ id: 2 });
        mockedSupabase.from.mockImplementation((table: string) => {
            if (table === 'payout_reservations') return chainQuery();
            return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => Promise.resolve({ data: { crypto_wallet_address: '0x1111111111111111111111111111111111111111' }, error: null })) })) })) };
        });

        await reconcilePayoutReservations();

        expect(mockedSupabase.rpc).toHaveBeenCalledWith('complete_payout_reservation', { p_reservation_id: 'r4', p_tx_hash: '0xevent' });
        expect(mockedTxModel.createTransaction).toHaveBeenCalledWith(expect.objectContaining({ blockchain_tx_hash: '0xevent', type: 'Payout' }));
    });

    it('releases a no-hash reservation when no PayoutCompleted event exists for the creator', async () => {
        const res = { id: 'r5', creator_id: 'c5', amount: 10000, blockchain_tx_hash: null, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() };
        mockReservations([res]);
        mockLogs = [];
        mockedSupabase.from.mockImplementation((table: string) => {
            if (table === 'payout_reservations') return chainQuery();
            return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => Promise.resolve({ data: { crypto_wallet_address: '0x2222222222222222222222222222222222222222' }, error: null })) })) })) };
        });

        await reconcilePayoutReservations();

        expect(mockedSupabase.rpc).toHaveBeenCalledWith('release_payout_reservation', { p_reservation_id: 'r5' });
    });

    it('skips a no-hash reservation when the creator has no wallet address (leaves for review)', async () => {
        const res = { id: 'r6', creator_id: 'c6', amount: 10000, blockchain_tx_hash: null, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() };
        mockReservations([res]);
        mockedSupabase.from.mockImplementation((table: string) => {
            if (table === 'payout_reservations') return chainQuery();
            return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => Promise.resolve({ data: null, error: { message: 'no profile' } })) })) })) };
        });

        await reconcilePayoutReservations();

        expect(mockedSupabase.rpc).not.toHaveBeenCalled();
    });
});