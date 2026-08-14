import { verifyWalletOwnershipSignature } from '../services/cryptoPayment.service';
import { ethers } from 'ethers';

describe('Phase 10 Security Remediation Unit Tests (TO-02, V-A05)', () => {
    let wallet: ethers.HDNodeWallet;
    const userId = 'user-uuid-1234';

    beforeAll(() => {
        wallet = ethers.Wallet.createRandom();
    });

    describe('Task 10.1: TO-02 Cryptographic Wallet Ownership Verification', () => {
        it('should pass verification when message and signature match target wallet address and userId', async () => {
            const message = `PoDM Wallet Ownership Proof:\nWallet: ${wallet.address}\nUser: ${userId}\nTimestamp: ${Date.now()}`;
            const signature = await wallet.signMessage(message);

            const isValid = verifyWalletOwnershipSignature(
                wallet.address,
                message,
                signature,
                userId
            );
            expect(isValid).toBe(true);
        });

        it('should reject verification when signature was produced by a different wallet address', async () => {
            const attackerWallet = ethers.Wallet.createRandom();
            const message = `PoDM Wallet Ownership Proof:\nWallet: ${wallet.address}\nUser: ${userId}\nTimestamp: ${Date.now()}`;
            const forgedSignature = await attackerWallet.signMessage(message);

            const isValid = verifyWalletOwnershipSignature(
                wallet.address,
                message,
                forgedSignature,
                userId
            );
            expect(isValid).toBe(false);
        });

        it('should reject verification when message contains wrong userId', async () => {
            const wrongUserId = 'user-uuid-9999';
            const message = `PoDM Wallet Ownership Proof:\nWallet: ${wallet.address}\nUser: ${wrongUserId}\nTimestamp: ${Date.now()}`;
            const signature = await wallet.signMessage(message);

            const isValid = verifyWalletOwnershipSignature(
                wallet.address,
                message,
                signature,
                userId // authenticated session userId differs from message
            );
            expect(isValid).toBe(false);
        });

        it('should reject verification when wallet address parameter format is invalid', () => {
            const invalidAddress = '0xinvalid_address_format';
            const isValid = verifyWalletOwnershipSignature(
                invalidAddress,
                'msg',
                'sig',
                userId
            );
            expect(isValid).toBe(false);
        });
    });

    describe('Task 10.2: V-A05 On-Ramp Destination Wallet Binding', () => {
        const resolveDestinationWallet = (
            profileSmartAccount: string,
            profileCryptoWallet: string,
            requestedDestination?: string,
            signature?: string,
            message?: string
        ): { wallet: string; isApproved: boolean; error?: string } => {
            const smartAccount = profileSmartAccount.toLowerCase();
            const cryptoWallet = profileCryptoWallet.toLowerCase();
            let targetWallet = requestedDestination ? requestedDestination.toLowerCase() : '';

            if (!targetWallet) {
                targetWallet = smartAccount || cryptoWallet;
            }

            if (!targetWallet || !/^0x[a-fA-F0-9]{40}$/.test(targetWallet)) {
                return { wallet: '', isApproved: false, error: 'No configured destination wallet address found for fan.' };
            }

            const isProfileWallet = targetWallet === smartAccount || targetWallet === cryptoWallet;
            if (!isProfileWallet && (smartAccount || cryptoWallet)) {
                if (!signature || !message) {
                    return { wallet: targetWallet, isApproved: false, error: 'External destination wallet override requires cryptographic signature verification.' };
                }

                try {
                    const recovered = ethers.verifyMessage(message, signature);
                    if (recovered.toLowerCase() !== targetWallet) {
                        return { wallet: targetWallet, isApproved: false, error: 'Signature verification failed for external destination wallet override.' };
                    }
                } catch {
                    return { wallet: targetWallet, isApproved: false, error: 'Invalid destination wallet signature.' };
                }
            }

            return { wallet: targetWallet, isApproved: true };
        };

        const profileSmartAccount = '0x1111111111111111111111111111111111111111';
        const profileCryptoWallet = '0x2222222222222222222222222222222222222222';

        it('should default destination wallet to fan smart account when omitted', () => {
            const res = resolveDestinationWallet(profileSmartAccount, profileCryptoWallet);
            expect(res.isApproved).toBe(true);
            expect(res.wallet.toLowerCase()).toBe(profileSmartAccount.toLowerCase());
        });

        it('should allow fan profile crypto wallet as destination without signature', () => {
            const res = resolveDestinationWallet(profileSmartAccount, profileCryptoWallet, profileCryptoWallet);
            expect(res.isApproved).toBe(true);
            expect(res.wallet.toLowerCase()).toBe(profileCryptoWallet.toLowerCase());
        });

        it('should reject external destination address override when signature is missing', () => {
            const externalAddress = '0x3333333333333333333333333333333333333333';
            const res = resolveDestinationWallet(profileSmartAccount, profileCryptoWallet, externalAddress);
            expect(res.isApproved).toBe(false);
            expect(res.error).toContain('External destination wallet override requires cryptographic signature verification');
        });

        it('should accept external destination address override when valid signature is provided', async () => {
            const externalWallet = ethers.Wallet.createRandom();
            const message = `Approve onramp destination: ${externalWallet.address}`;
            const signature = await externalWallet.signMessage(message);

            const res = resolveDestinationWallet(
                profileSmartAccount,
                profileCryptoWallet,
                externalWallet.address,
                signature,
                message
            );
            expect(res.isApproved).toBe(true);
            expect(res.wallet.toLowerCase()).toBe(externalWallet.address.toLowerCase());
        });
    });
});
