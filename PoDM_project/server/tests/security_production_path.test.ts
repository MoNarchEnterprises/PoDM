import { ethers } from 'ethers';
import express from 'express';
import { createServer, Server } from 'http';
import supabase from '../config/supabaseClient';
import { assertCatalogPrice } from '../services/paymentCatalog.service';
import { updateUserWalletConfig, verifyWalletOwnershipSignature } from '../services/cryptoPayment.service';
import { buildWalletOwnershipMessage } from '../../common/walletOwnership';
import cryptoPaymentRouter from '../routes/cryptoPayment.routes';
import { errorHandler } from '../middleware/error.middleware';

jest.mock('../config/supabaseClient', () => ({
    __esModule: true,
    default: { from: jest.fn() },
}));

jest.mock('../middleware/auth.middleware', () => ({
    protect: (req: any, _res: any, next: any) => {
        req.user = { id: 'creator-1', role: 'creator' };
        next();
    },
}));

const mockedSupabase = supabase as any;

function queryResult(data: any, error: any = null) {
    const query: any = {
        select: () => query,
        eq: () => query,
        update: () => query,
        maybeSingle: () => Promise.resolve({ data, error }),
        single: () => Promise.resolve({ data, error }),
    };
    return query;
}

describe('production-path security controls', () => {
    beforeEach(() => jest.clearAllMocks());

    it('binds subscription verification to the authoritative creator catalog price', async () => {
        mockedSupabase.from.mockReturnValue(queryResult({
            creator_data: { subscriptionTiers: [{ id: 'tier-basic', price: 12.5 }] },
        }));

        await expect(assertCatalogPrice({
            creatorId: 'creator-1', transactionType: 'Subscription', relatedId: 'tier-basic', amountInCents: 1250,
        })).resolves.toBe(1250);

        await expect(assertCatalogPrice({
            creatorId: 'creator-1', transactionType: 'Subscription', relatedId: 'tier-basic', amountInCents: 1,
        })).rejects.toThrow('does not match the catalog price');
    });

    it('binds PPV verification to both content ownership and catalog price', async () => {
        mockedSupabase.from.mockReturnValue(queryResult({
            id: 'content-1', creator_id: 'creator-1', visibility: 'pay_per_view', price: 5,
        }));

        await expect(assertCatalogPrice({
            creatorId: 'creator-1', transactionType: 'PPV Post', relatedId: 'content-1', amountInCents: 500,
        })).resolves.toBe(500);

        await expect(assertCatalogPrice({
            creatorId: 'attacker', transactionType: 'PPV Post', relatedId: 'content-1', amountInCents: 500,
        })).rejects.toThrow('invalid for this creator');
    });

    it('rejects arbitrary custom-wallet assignment on the production service path', async () => {
        await expect(updateUserWalletConfig('creator-1', {
            walletAddress: ethers.Wallet.createRandom().address,
            walletType: 'custom',
            payoutPreference: 'on_chain',
        })).rejects.toThrow('requires a cryptographic ownership signature');
    });

    it('accepts only a fresh signature bound to wallet and authenticated user', async () => {
        const wallet = ethers.Wallet.createRandom();
        const userId = 'creator-1';
        const message = buildWalletOwnershipMessage(wallet.address, userId);
        const signature = await wallet.signMessage(message);

        expect(verifyWalletOwnershipSignature(wallet.address, message, signature, userId)).toBe(true);
        expect(verifyWalletOwnershipSignature(wallet.address, message, signature, 'other-user')).toBe(false);
        expect(verifyWalletOwnershipSignature(
            wallet.address,
            buildWalletOwnershipMessage(wallet.address, userId, Date.now() - 11 * 60 * 1000),
            signature,
            userId,
        )).toBe(false);
    });

    it('rejects arbitrary wallet assignment through the real HTTP route', async () => {
        const app = express();
        app.use(express.json());
        app.use('/api/v1/payments/crypto', cryptoPaymentRouter);
        app.use(errorHandler);
        const server: Server = createServer(app);
        await new Promise<void>(resolve => server.listen(0, resolve));
        const address = server.address() as any;

        try {
            const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/payments/crypto/wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: ethers.Wallet.createRandom().address,
                    walletType: 'custom',
                    payoutPreference: 'on_chain',
                }),
            });
            expect(response.status).toBe(400);
            expect((await response.json()).message).toContain('cryptographic ownership signature');
        } finally {
            await new Promise<void>(resolve => server.close(() => resolve()));
        }
    });
});
