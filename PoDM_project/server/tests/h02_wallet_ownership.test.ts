import { ethers } from 'ethers';
import express from 'express';
import { createServer, Server } from 'http';
import supabase from '../config/supabaseClient';
import {
    createWalletOwnershipChallenge,
    updateUserWalletConfig,
    verifyWalletOwnershipSignature,
} from '../services/cryptoPayment.service';
import { buildWalletOwnershipChallengeMessage, buildWalletOwnershipMessage } from '../../common/walletOwnership';
import { updateFanSettings, updateUserProfile } from '../services/user.service';
import * as UserModel from '../models/user.model';
import cryptoPaymentRouter from '../routes/cryptoPayment.routes';
import { errorHandler } from '../middleware/error.middleware';

jest.mock('../config/supabaseClient', () => ({
    __esModule: true,
    default: { from: jest.fn() },
}));

jest.mock('../models/user.model', () => ({
    updateProfile: jest.fn(),
    findUserById: jest.fn(),
}));

jest.mock('../middleware/auth.middleware', () => ({
    protect: (req: any, _res: any, next: any) => {
        if (req.headers['x-test-unauth']) {
            const { AppError } = require('../middleware/error.middleware');
            return next(new AppError('Not authorized to access this route', 401));
        }
        const authUserId = req.headers['x-test-user-id'] || 'user-1';
        req.user = { id: authUserId, role: 'creator' };
        next();
    },
}));

const mockedSupabase = supabase as any;
const mockedUserModel = UserModel as any;

describe('H-02: Cryptographic Wallet Ownership Verification (Full Invariant Suite)', () => {
    let mockChallenges: Map<string, any>;
    let mockProfiles: Map<string, any>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockChallenges = new Map();
        mockProfiles = new Map();

        mockProfiles.set('user-1', {
            id: 'user-1',
            crypto_wallet_address: null,
            crypto_wallet_type: 'none',
            crypto_wallet_payout_preference: 'debit_card',
        });

        // Configurable mock implementation for supabase.from()
        mockedSupabase.from.mockImplementation((table: string) => {
            if (table === 'wallet_verification_challenges') {
                return {
                    insert: (records: any) => {
                        const rec = Array.isArray(records) ? records[0] : records;
                        const recordWithId = {
                            id: rec.id || 'chal-' + Math.random().toString(36).substring(2, 9),
                            created_at: new Date().toISOString(),
                            used_at: null,
                            ...rec,
                        };
                        mockChallenges.set(recordWithId.id, { ...recordWithId });
                        return {
                            select: () => ({
                                single: () => Promise.resolve({ data: { ...recordWithId }, error: null }),
                            }),
                        };
                    },
                    select: (_cols?: string) => {
                        return {
                            eq: (field: string, val: any) => {
                                const matched = Array.from(mockChallenges.values()).filter(c => c[field] === val);
                                return {
                                    single: () => Promise.resolve({
                                        data: matched[0] ? { ...matched[0] } : null,
                                        error: matched[0] ? null : { message: 'Challenge not found' },
                                    }),
                                    maybeSingle: () => Promise.resolve({
                                        data: matched[0] ? { ...matched[0] } : null,
                                        error: null,
                                    }),
                                };
                            },
                        };
                    },
                    update: (updates: any) => {
                        let filterId: string | null = null;
                        let filterUserId: string | null = null;
                        let filterWallet: string | null = null;
                        let requireUnused = false;
                        let requireNotExpired = false;

                        const builder: any = {
                            eq: (field: string, val: any) => {
                                if (field === 'id') filterId = val;
                                if (field === 'user_id') filterUserId = val;
                                if (field === 'wallet_address') filterWallet = val;
                                return builder;
                            },
                            is: (field: string, val: any) => {
                                if (field === 'used_at' && val === null) requireUnused = true;
                                return builder;
                            },
                            gt: (field: string, _val: any) => {
                                if (field === 'expires_at') requireNotExpired = true;
                                return builder;
                            },
                            select: () => ({
                                single: () => {
                                    if (!filterId || !mockChallenges.has(filterId)) {
                                        return Promise.resolve({ data: null, error: { message: 'Not found' } });
                                    }
                                    const challenge = mockChallenges.get(filterId);
                                    if (filterUserId && challenge.user_id !== filterUserId) {
                                        return Promise.resolve({ data: null, error: { message: 'User mismatch' } });
                                    }
                                    if (filterWallet && ethers.getAddress(challenge.wallet_address) !== ethers.getAddress(filterWallet)) {
                                        return Promise.resolve({ data: null, error: { message: 'Wallet mismatch' } });
                                    }
                                    if (requireUnused && challenge.used_at !== null) {
                                        return Promise.resolve({ data: null, error: { message: 'Already consumed' } });
                                    }
                                    if (requireNotExpired && new Date(challenge.expires_at).getTime() < Date.now()) {
                                        return Promise.resolve({ data: null, error: { message: 'Expired' } });
                                    }

                                    // Atomic update
                                    const updated = { ...challenge, ...updates };
                                    mockChallenges.set(filterId, updated);
                                    return Promise.resolve({ data: { ...updated }, error: null });
                                },
                            }),
                        };
                        return builder;
                    },
                };
            }

            if (table === 'profiles') {
                return {
                    select: (_cols?: string) => ({
                        eq: (_field: string, val: any) => ({
                            single: () => Promise.resolve({
                                data: mockProfiles.get(val) || { id: val, crypto_wallet_address: null },
                                error: null,
                            }),
                        }),
                    }),
                    update: (updates: any) => ({
                        eq: (_field: string, val: any) => ({
                            select: () => ({
                                single: () => {
                                    const current = mockProfiles.get(val) || { id: val };
                                    const updated = { ...current, ...updates };
                                    mockProfiles.set(val, updated);
                                    return Promise.resolve({ data: { ...updated }, error: null });
                                },
                            }),
                        }),
                    }),
                };
            }

            return {};
        });
    });

    describe('Challenge Generation & Canonical Format', () => {
        it('generates a domain-separated, user-bound challenge with short expiration', async () => {
            const wallet = ethers.Wallet.createRandom();
            const challenge = await createWalletOwnershipChallenge('user-1', wallet.address);

            expect(challenge.challengeId).toBeDefined();
            expect(challenge.walletAddress).toBe(ethers.getAddress(wallet.address));
            expect(challenge.message).toContain('PoDM Wallet Ownership Verification');
            expect(challenge.message).toContain('Domain: podm.app');
            expect(challenge.message).toContain(`User: user-1`);
            expect(challenge.message).toContain(`Wallet: ${ethers.getAddress(wallet.address)}`);
            expect(challenge.message).toContain(`Challenge: ${challenge.challengeId}`);
            expect(new Date(challenge.expiresAt).getTime()).toBeGreaterThan(Date.now());
        });

        it('rejects malformed wallet addresses during challenge creation', async () => {
            await expect(createWalletOwnershipChallenge('user-1', '0xinvalid')).rejects.toThrow(
                'Invalid Ethereum wallet address format'
            );
        });
    });

    describe('Authoritative Verification & Profile Mutation Gate', () => {
        it('successfully verifies ownership and updates profile for first-time wallet registration', async () => {
            const wallet = ethers.Wallet.createRandom();
            const challenge = await createWalletOwnershipChallenge('user-1', wallet.address);
            const signature = await wallet.signMessage(challenge.message);

            const result = await updateUserWalletConfig('user-1', {
                walletAddress: wallet.address,
                walletType: 'custom',
                payoutPreference: 'on_chain',
                challengeId: challenge.challengeId,
                signature,
            });

            expect(result.walletAddress).toBe(ethers.getAddress(wallet.address));
            expect(result.walletType).toBe('custom');
            expect(result.payoutPreference).toBe('on_chain');

            // Verify challenge was consumed atomically
            const consumed = mockChallenges.get(challenge.challengeId);
            expect(consumed.used_at).not.toBeNull();
        });

        it('successfully replaces an existing wallet when ownership of the new wallet is proved', async () => {
            const oldWallet = ethers.Wallet.createRandom();
            mockProfiles.set('user-1', {
                id: 'user-1',
                crypto_wallet_address: oldWallet.address,
                crypto_wallet_type: 'custom',
                crypto_wallet_payout_preference: 'on_chain',
            });

            const newWallet = ethers.Wallet.createRandom();
            const challenge = await createWalletOwnershipChallenge('user-1', newWallet.address);
            const signature = await newWallet.signMessage(challenge.message);

            const result = await updateUserWalletConfig('user-1', {
                walletAddress: newWallet.address,
                walletType: 'custom',
                payoutPreference: 'on_chain',
                challengeId: challenge.challengeId,
                signature,
            });

            expect(result.walletAddress).toBe(ethers.getAddress(newWallet.address));
            expect(mockProfiles.get('user-1').crypto_wallet_address).toBe(ethers.getAddress(newWallet.address));
        });

        it('rejects wallet update if signature is missing (fail-closed)', async () => {
            const wallet = ethers.Wallet.createRandom();
            await expect(updateUserWalletConfig('user-1', {
                walletAddress: wallet.address,
                walletType: 'custom',
                payoutPreference: 'on_chain',
            })).rejects.toThrow('requires a cryptographic ownership signature');
        });

        it('rejects wallet update if challengeId is missing and no canonical message provided', async () => {
            const wallet = ethers.Wallet.createRandom();
            await expect(updateUserWalletConfig('user-1', {
                walletAddress: wallet.address,
                walletType: 'custom',
                payoutPreference: 'on_chain',
                signature: '0x1234',
            })).rejects.toThrow('requires a challenge ID and cryptographic signature');
        });

        it('rejects signature signed by a different wallet address', async () => {
            const walletA = ethers.Wallet.createRandom();
            const attackerWallet = ethers.Wallet.createRandom();

            const challenge = await createWalletOwnershipChallenge('user-1', walletA.address);
            const attackerSignature = await attackerWallet.signMessage(challenge.message);

            await expect(updateUserWalletConfig('user-1', {
                walletAddress: walletA.address,
                walletType: 'custom',
                payoutPreference: 'on_chain',
                challengeId: challenge.challengeId,
                signature: attackerSignature,
            })).rejects.toThrow('Signature does not match the requested wallet address');

            // Ensure profile was NOT updated
            expect(mockProfiles.get('user-1').crypto_wallet_address).toBeNull();
        });

        it('rejects challenge generated for user A when submitted by user B', async () => {
            const wallet = ethers.Wallet.createRandom();
            const challenge = await createWalletOwnershipChallenge('user-1', wallet.address);
            const signature = await wallet.signMessage(challenge.message);

            await expect(updateUserWalletConfig('attacker-user-2', {
                walletAddress: wallet.address,
                walletType: 'custom',
                payoutPreference: 'on_chain',
                challengeId: challenge.challengeId,
                signature,
            })).rejects.toThrow('Challenge does not belong to the authenticated user');
        });

        it('rejects challenge if submitted wallet address does not match challenged wallet', async () => {
            const walletA = ethers.Wallet.createRandom();
            const walletB = ethers.Wallet.createRandom();

            const challenge = await createWalletOwnershipChallenge('user-1', walletA.address);
            const signature = await walletA.signMessage(challenge.message);

            await expect(updateUserWalletConfig('user-1', {
                walletAddress: walletB.address,
                walletType: 'custom',
                payoutPreference: 'on_chain',
                challengeId: challenge.challengeId,
                signature,
            })).rejects.toThrow('Challenge wallet address does not match requested wallet address');
        });

        it('rejects expired challenges', async () => {
            const wallet = ethers.Wallet.createRandom();
            const challenge = await createWalletOwnershipChallenge('user-1', wallet.address);
            const signature = await wallet.signMessage(challenge.message);

            // Expire the challenge in DB
            const stored = mockChallenges.get(challenge.challengeId);
            stored.expires_at = new Date(Date.now() - 1000).toISOString();

            await expect(updateUserWalletConfig('user-1', {
                walletAddress: wallet.address,
                walletType: 'custom',
                payoutPreference: 'on_chain',
                challengeId: challenge.challengeId,
                signature,
            })).rejects.toThrow('Wallet verification challenge has expired');
        });

        it('rejects replay of an already-used challenge', async () => {
            const wallet = ethers.Wallet.createRandom();
            const challenge = await createWalletOwnershipChallenge('user-1', wallet.address);
            const signature = await wallet.signMessage(challenge.message);

            // First submission succeeds
            await updateUserWalletConfig('user-1', {
                walletAddress: wallet.address,
                walletType: 'custom',
                payoutPreference: 'on_chain',
                challengeId: challenge.challengeId,
                signature,
            });

            // Replay submission fails
            await expect(updateUserWalletConfig('user-1', {
                walletAddress: wallet.address,
                walletType: 'custom',
                payoutPreference: 'on_chain',
                challengeId: challenge.challengeId,
                signature,
            })).rejects.toThrow('Wallet verification challenge has already been used');
        });

        it('permits only one success under concurrent challenge consumption', async () => {
            const wallet = ethers.Wallet.createRandom();
            const challenge = await createWalletOwnershipChallenge('user-1', wallet.address);
            const signature = await wallet.signMessage(challenge.message);

            // Simulate concurrent requests
            const req1 = updateUserWalletConfig('user-1', {
                walletAddress: wallet.address,
                walletType: 'custom',
                payoutPreference: 'on_chain',
                challengeId: challenge.challengeId,
                signature,
            });

            const req2 = updateUserWalletConfig('user-1', {
                walletAddress: wallet.address,
                walletType: 'custom',
                payoutPreference: 'on_chain',
                challengeId: challenge.challengeId,
                signature,
            });

            const results = await Promise.allSettled([req1, req2]);
            const fulfilled = results.filter(r => r.status === 'fulfilled');
            const rejected = results.filter(r => r.status === 'rejected');

            expect(fulfilled.length).toBe(1);
            expect(rejected.length).toBe(1);
        });
    });

    describe('Secondary Write Path Audit & Bypass Prevention', () => {
        it('prevents updateFanSettings from mutating crypto_wallet_address', async () => {
            mockedUserModel.updateProfile.mockResolvedValue({ id: 'user-1' });
            mockedUserModel.findUserById.mockResolvedValue({ id: 'user-1' });

            await updateFanSettings('user-1', {
                profile: {
                    name: 'Updated Name',
                    bio: 'Updated Bio',
                    crypto_wallet_address: '0x9999999999999999999999999999999999999999',
                },
            });

            expect(mockedUserModel.updateProfile).toHaveBeenCalledWith(
                'user-1',
                expect.not.objectContaining({
                    crypto_wallet_address: '0x9999999999999999999999999999999999999999',
                })
            );
        });

        it('prevents updateUserProfile from mutating sensitive crypto wallet fields', async () => {
            mockedUserModel.updateProfile.mockResolvedValue({
                id: 'user-1',
                username: 'cleanUser',
                status: 'active',
            });

            await updateUserProfile('user-1', {
                username: 'cleanUser',
                bio: 'clean bio',
                crypto_wallet_address: '0xattackerwallet',
                crypto_wallet_type: 'custom',
            } as any);

            expect(mockedUserModel.updateProfile).toHaveBeenCalledWith(
                'user-1',
                expect.not.objectContaining({
                    crypto_wallet_address: '0xattackerwallet',
                    crypto_wallet_type: 'custom',
                })
            );
        });
    });

    describe('HTTP Route Integration Gate', () => {
        let app: express.Express;
        let server: Server;
        let baseUrl: string;

        beforeAll(async () => {
            app = express();
            app.use(express.json());
            app.use('/api/v1/payments/crypto', cryptoPaymentRouter);
            app.use(errorHandler);

            server = createServer(app);
            await new Promise<void>(resolve => server.listen(0, resolve));
            const address = server.address() as any;
            baseUrl = `http://127.0.0.1:${address.port}/api/v1/payments/crypto`;
        });

        afterAll(async () => {
            await new Promise<void>(resolve => server.close(() => resolve()));
        });

        it('rejects unauthenticated challenge request with 401', async () => {
            const wallet = ethers.Wallet.createRandom();
            const response = await fetch(`${baseUrl}/wallet/challenge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-test-unauth': 'true',
                },
                body: JSON.stringify({ walletAddress: wallet.address }),
            });
            expect(response.status).toBe(401);
        });

        it('generates challenge and allows authenticated user to update wallet with valid signature', async () => {
            const wallet = ethers.Wallet.createRandom();

            // 1. Request Challenge
            const chalRes = await fetch(`${baseUrl}/wallet/challenge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-test-user-id': 'user-1',
                },
                body: JSON.stringify({ walletAddress: wallet.address }),
            });
            expect(chalRes.status).toBe(200);
            const chalBody = await chalRes.json();
            expect(chalBody.data.challengeId).toBeDefined();

            // 2. Sign canonical challenge message
            const signature = await wallet.signMessage(chalBody.data.message);

            // 3. Post wallet update
            const updateRes = await fetch(`${baseUrl}/wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-test-user-id': 'user-1',
                },
                body: JSON.stringify({
                    walletAddress: wallet.address,
                    walletType: 'custom',
                    payoutPreference: 'on_chain',
                    challengeId: chalBody.data.challengeId,
                    signature,
                }),
            });
            expect(updateRes.status).toBe(200);
            const updateBody = await updateRes.json();
            expect(updateBody.data.walletAddress).toBe(ethers.getAddress(wallet.address));
        });

        it('rejects wallet update via HTTP route when signature is missing', async () => {
            const wallet = ethers.Wallet.createRandom();
            const response = await fetch(`${baseUrl}/wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-test-user-id': 'user-1',
                },
                body: JSON.stringify({
                    walletAddress: wallet.address,
                    walletType: 'custom',
                    payoutPreference: 'on_chain',
                }),
            });
            expect(response.status).toBe(400);
            const body = await response.json();
            expect(body.message).toContain('cryptographic ownership signature');
        });
    });
});
