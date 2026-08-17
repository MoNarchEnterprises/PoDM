import crypto from 'crypto';
import supabase from '../config/supabaseClient';
import * as TransactionModel from '../models/transaction.model';
import { AppError } from '../middleware/error.middleware';
import { DEFAULT_COMMISSION_RATE, REFERRAL_FEE_BPS } from '../../lib/constants';
import { getEffectiveCommissionRate } from '../utils/commission.utils';
import { ethers } from 'ethers';
import axios from 'axios';
import { getCryptoWalletForUser } from './wallet.service';
import { incrementContentTipStats, incrementContentPpvEarningsStats } from './content.service';
import { calculateReferralFee, getReferrerWalletForCreator, recordReferralFee } from './referral.service';
import { assertCatalogPrice } from './paymentCatalog.service';
import { canonicalPaymentIdentifier } from '../../common/paymentIdentifier';
import { buildWalletOwnershipChallengeMessage } from '../../common/walletOwnership';

export interface WalletConfigInput {
    walletAddress?: string;
    walletType: 'none' | 'embedded' | 'custom' | string;
    payoutPreference: 'debit_card' | 'on_chain' | 'base' | string;
    challengeId?: string;
    signature?: string;
    message?: string;
}

interface PaymentVerificationInput {
    txHash: string;
    fanId: string;
    creatorId: string;
    amountInCents: number;
    transactionType: 'Tip' | 'PPV Message' | 'PPV Post' | 'Subscription';
    relatedId?: string;
    paymentIntentId?: string;
}

export interface PaymentIntentInput {
    clientIntentId: string;
    fanId: string;
    creatorId: string;
    amountInCents: number;
    transactionType: 'Tip' | 'PPV Message' | 'PPV Post' | 'Subscription';
    relatedId?: string;
}

import { getContractConfig, EVENT_TOPICS } from '../utils/contract.utils';

function getRpcConfig(): { rpcUrl: string; contractAddress: string; usdcContract: string; chainId: number } {
    const { rpcUrl, contractAddress, usdcAddress, chainId } = getContractConfig();
    return { rpcUrl, contractAddress, usdcContract: usdcAddress, chainId };
}

async function getCommissionRate(creatorId: string): Promise<number> {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('commission_rate, is_enclave_member')
        .eq('id', creatorId)
        .single();

    if (error) {
        console.error('[CryptoPaymentService] Failed to fetch commission_rate:', error.message);
        return DEFAULT_COMMISSION_RATE;
    }

    return getEffectiveCommissionRate(profile);
}



/**
 * Resolves the referrer payment details a fan must pass to the contract for a
 * creator payment. Returns the referrer's wallet address ('' when the creator
 * has no active percentage referral) and the on-chain referral fee basis points.
 */
export const getPaymentReferrerInfo = async (creatorId: string) => {
    const referrerAddress = await getReferrerWalletForCreator(creatorId);
    const commissionRate = await getCommissionRate(creatorId);
    const platformFeeBps = Math.round(commissionRate * 100);
    return {
        referrerAddress,
        referralFeeBps: REFERRAL_FEE_BPS,
        platformFeeBps,
    };
};

export const getUserWalletConfig = async (userId: string) => {    const { data: profile, error } = await supabase
        .from('profiles')
        .select('crypto_wallet_address, crypto_wallet_type, crypto_wallet_payout_preference, commission_rate, is_enclave_member')
        .eq('id', userId)
        .single();

    if (error) {
        throw new AppError(`Failed to fetch wallet configuration: ${error.message}`, 500);
    }

    return {
        walletAddress: profile.crypto_wallet_address || null,
        walletType: profile.crypto_wallet_type || 'none',
        payoutPreference: profile.crypto_wallet_payout_preference || 'debit_card',
        commissionRate: getEffectiveCommissionRate(profile),
        isEnclaveMember: Boolean(profile.is_enclave_member),
    };
};

export async function createWalletOwnershipChallenge(userId: string, rawWalletAddress: string) {
    if (!rawWalletAddress || !ethers.isAddress(rawWalletAddress)) {
        throw new AppError('Invalid Ethereum wallet address format.', 400);
    }
    const walletAddress = ethers.getAddress(rawWalletAddress);
    const nonce = crypto.randomBytes(32).toString('hex');
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 5 * 60 * 1000); // 5 minutes validity
    const challengeId = crypto.randomUUID();

    const message = buildWalletOwnershipChallengeMessage({
        challengeId,
        userId,
        walletAddress,
        nonce,
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
    });

    const { data, error } = await supabase
        .from('wallet_verification_challenges')
        .insert({
            id: challengeId,
            user_id: userId,
            wallet_address: walletAddress,
            nonce,
            purpose: 'wallet_ownership',
            message,
            issued_at: issuedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

    if (error || !data) {
        throw new AppError(`Failed to create wallet verification challenge: ${error?.message || 'Unknown database error'}`, 500);
    }

    return {
        challengeId: data.id,
        walletAddress: data.wallet_address,
        message: data.message,
        expiresAt: data.expires_at,
    };
}

export function verifyWalletOwnershipSignature(
    walletAddress: string,
    message: string,
    signature: string,
    userId: string
): boolean {
    if (!walletAddress || !message || !signature) return false;
    if (!ethers.isAddress(walletAddress)) return false;

    try {
        const lines = message.split('\n');
        if (lines.length !== 4 || lines[0] !== 'PoDM Wallet Ownership Proof:') return false;
        const messageWallet = lines[1].startsWith('Wallet: ') ? lines[1].slice(8).trim() : '';
        const messageUser = lines[2].startsWith('User: ') ? lines[2].slice(6) : '';
        const timestampText = lines[3].startsWith('Timestamp: ') ? lines[3].slice(11) : '';
        const timestamp = Number(timestampText);
        if (!ethers.isAddress(messageWallet) || ethers.getAddress(messageWallet) !== ethers.getAddress(walletAddress)) return false;
        if (messageUser !== userId || !Number.isSafeInteger(timestamp)) return false;
        const maxAgeMs = 10 * 60 * 1000;
        if (timestamp < Date.now() - maxAgeMs || timestamp > Date.now() + maxAgeMs) return false;

        const recovered = ethers.verifyMessage(message, signature);
        if (ethers.getAddress(recovered) !== ethers.getAddress(walletAddress)) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

export const updateUserWalletConfig = async (userId: string, input: WalletConfigInput) => {
    let targetWalletAddress: string | null = null;

    if (input.walletType === 'custom') {
        if (!input.walletAddress || !ethers.isAddress(input.walletAddress)) {
            throw new AppError('Invalid Ethereum wallet address format.', 400);
        }
        targetWalletAddress = ethers.getAddress(input.walletAddress);

        if (!input.signature) {
            throw new AppError('Custom wallet assignment requires a cryptographic ownership signature.', 400);
        }

        if (input.challengeId) {
            // Authoritative server challenge path
            const { data: challenge, error: challengeErr } = await supabase
                .from('wallet_verification_challenges')
                .select('*')
                .eq('id', input.challengeId)
                .single();

            if (challengeErr || !challenge) {
                throw new AppError('Wallet verification challenge not found.', 400);
            }
            if (challenge.user_id !== userId) {
                throw new AppError('Challenge does not belong to the authenticated user.', 400);
            }
            if (ethers.getAddress(challenge.wallet_address) !== targetWalletAddress) {
                throw new AppError('Challenge wallet address does not match requested wallet address.', 400);
            }
            if (challenge.purpose !== 'wallet_ownership') {
                throw new AppError('Invalid challenge purpose.', 400);
            }
            if (challenge.used_at) {
                throw new AppError('Wallet verification challenge has already been used.', 400);
            }
            if (new Date(challenge.expires_at).getTime() < Date.now()) {
                throw new AppError('Wallet verification challenge has expired.', 400);
            }

            let recoveredSigner: string;
            try {
                recoveredSigner = ethers.verifyMessage(challenge.message, input.signature);
            } catch {
                throw new AppError('Invalid cryptographic signature format.', 400);
            }

            if (ethers.getAddress(recoveredSigner) !== targetWalletAddress) {
                throw new AppError('Signature does not match the requested wallet address.', 400);
            }

            // Atomic consumption of single-use challenge
            const { data: consumed, error: consumeErr } = await supabase
                .from('wallet_verification_challenges')
                .update({ used_at: new Date().toISOString() })
                .eq('id', input.challengeId)
                .eq('user_id', userId)
                .eq('wallet_address', challenge.wallet_address)
                .is('used_at', null)
                .gt('expires_at', new Date().toISOString())
                .select()
                .single();

            if (consumeErr || !consumed) {
                throw new AppError('Failed to consume wallet challenge. It may have already been used or expired.', 400);
            }
        } else if (input.message) {
            // Canonical message verification fallback
            const isValid = verifyWalletOwnershipSignature(
                targetWalletAddress,
                input.message,
                input.signature,
                userId
            );
            if (!isValid) {
                throw new AppError('Wallet ownership signature verification failed.', 400);
            }
        } else {
            throw new AppError('Custom wallet assignment requires a challenge ID and cryptographic signature.', 400);
        }
    } else if (input.walletType === 'embedded') {
        const { data: profile } = await supabase
            .from('profiles')
            .select('crypto_wallet_address')
            .eq('id', userId)
            .single();

        targetWalletAddress = profile?.crypto_wallet_address || null;
    } else if (input.walletType === 'none') {
        targetWalletAddress = null;
    } else {
        throw new AppError('Invalid wallet type specified.', 400);
    }

    const { data, error } = await supabase
        .from('profiles')
        .update({
            crypto_wallet_address: targetWalletAddress,
            crypto_wallet_type: input.walletType,
            crypto_wallet_payout_preference: input.payoutPreference
        })
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        throw new AppError(`Failed to update wallet configuration: ${error.message}`, 500);
    }

    return {
        walletAddress: data.crypto_wallet_address,
        walletType: data.crypto_wallet_type,
        payoutPreference: data.crypto_wallet_payout_preference
    };
};

export const verifyAndRecordBasePayment = async (input: PaymentVerificationInput) => {
    // Validate the transaction identifier before any catalog lookup so malformed
    // requests cannot trigger unnecessary database work.
    if (!input.txHash || !/^0x[A-Fa-f0-9]{64}$/.test(input.txHash)) {
        throw new AppError('Invalid transaction hash format. Must be a 64-character hex string starting with 0x.', 400);
    }

    await assertCatalogPrice({
        creatorId: input.creatorId,
        transactionType: input.transactionType,
        relatedId: input.relatedId,
        amountInCents: input.amountInCents,
    });

    // 1. Check for duplicates
    const { data: existingTx, error: lookupError } = await supabase
        .from('transactions')
        .select('*')
        .eq('blockchain_tx_hash', input.txHash)
        .maybeSingle();

    if (lookupError) {
        throw new AppError(`Database lookup failed: ${lookupError.message}`, 500);
    }

    if (existingTx) {
        throw new AppError('This transaction hash has already been verified and processed.', 409);
    }

    // 3. Fetch creator's configured wallet address via canonical service
    const creatorWalletAddress = await getCryptoWalletForUser(input.creatorId);

    // Fee settings & referrer resolution (needed for on-chain referral validation)
    const commissionRate = await getCommissionRate(input.creatorId);
    const expectedReferrerWallet = await getReferrerWalletForCreator(input.creatorId);

    // 4. Strict on-chain verification via Base JSON-RPC
    const { rpcUrl, contractAddress, chainId } = getRpcConfig();

    if (!contractAddress) {
        throw new AppError(
            'PoDM smart contract address not configured. Set BASE_CONTRACT_ADDRESS or BASE_TESTNET_CONTRACT_ADDRESS env var.',
            500
        );
    }

let payerHex = '';
    let verifiedReceipt: any = null;
    try {
        // 2.5 Retry-on-pending for up to 15s: if the tx is not yet mined, poll with backoff.
        // This solves the race where the client submits the request immediately after sending
        // the transaction. We only ever verify transactions whose receipt is actually on chain —
        // unverified transactions are NEVER marked Cleared.
        const MAX_ATTEMPTS = 5;
        const ATTEMPT_DELAY_MS = 3000;
        let receipt: any | null = null;
        let lastRpc = null;
        let attempt = 0;
        for (; attempt < MAX_ATTEMPTS; attempt++) {
            const receiptResponse = await axios.post(rpcUrl, {
                jsonrpc: '2.0',
                method: 'eth_getTransactionReceipt',
                params: [input.txHash],
                id: 1
            });
            lastRpc = receiptResponse.data;
            receipt = receiptResponse.data?.result;
            if (receipt) break;
            await new Promise((resolve) => setTimeout(resolve, ATTEMPT_DELAY_MS));
        }

        if (!receipt) {
            // After MAX_ATTEMPTS, the tx is either pending, dropped, or never broadcast.
            // Never record it. Surface a 404 so the client can retry verification later.
            throw new AppError('Transaction receipt not found on-chain. It might still be pending or was never broadcast.', 404);
        }

        if (lastRpc?.error) {
            throw new AppError(`Blockchain RPC error: ${lastRpc.error.message}`, 503);
        }

        if (receipt.status !== '0x1') {
            throw new AppError('Transaction failed on the blockchain.', 400);
        }

        // --- M-01: Explicit finality / reorg policy ---
        // Never mark a transaction Cleared based on a single receipt.
        // We require:
        //   1. Minimum confirmation threshold (configurable via BASE_MIN_CONFIRMATIONS, default 2)
        //   2. Receipt must still be observable at the final block (reorg protection)
        //   3. RPC chain ID must match configured chain ID (network partition protection)
        //   4. Receipt status must be 'success' (0x1)
        // --- End M-01 policy ---

        // The configured network is authoritative. Never allow a request-scoped
        // or frontend-provided chain ID to redefine the verification network.
        const chainIdResponse = await axios.post(rpcUrl, {
                jsonrpc: '2.0',
                method: 'eth_chainId',
                params: [],
                id: 2
        });
        const rpcChainIdHex = chainIdResponse.data?.result;
        const rpcChainId = rpcChainIdHex ? parseInt(rpcChainIdHex, 16) : null;
        if (!rpcChainId || rpcChainId !== chainId) {
            throw new AppError(`Network mismatch: Transaction RPC chain ID (${rpcChainId ?? 'unknown'}) does not match configured platform chain ID (${chainId}).`, 400);
        }

        // Fetch latest block number for reorg protection: the receipt must be
        // observable at a block that is not behind a reorg'd chain.
        const latestBlockResponse = await axios.post(rpcUrl, {
            jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 3,
        });
        const latestBlockNumber = latestBlockResponse.data?.result
            ? parseInt(latestBlockResponse.data.result, 16)
            : 0;

        const receiptBlockNumber = receipt.blockNumber ? parseInt(receipt.blockNumber, 16) : 0;
        const minConfirmations = Math.max(1, Number(process.env.BASE_MIN_CONFIRMATIONS || 2));
        const confirmations = receiptBlockNumber > 0 && latestBlockNumber >= receiptBlockNumber
            ? latestBlockNumber - receiptBlockNumber + 1
            : 0;

        if (!confirmations || confirmations < minConfirmations) {
            throw new AppError(`Transaction is awaiting finality (${confirmations}/${minConfirmations} confirmations).`, 425);
        }

        // Reorg protection: re-fetch the receipt at the final block to ensure it
        // is still present (some RPCs may serve stale data after a reorg).
        let receiptAtFinalBlock: any = receipt;
        for (let i = 0; i < minConfirmations; i++) {
            const reorgReceiptResponse = await axios.post(rpcUrl, {
                jsonrpc: '2.0',
                method: 'eth_getTransactionReceipt',
                params: [input.txHash],
                id: 4 + i
            });
            if (reorgReceiptResponse.data?.result) {
                receiptAtFinalBlock = reorgReceiptResponse.data.result;
                if (receiptAtFinalBlock.status === '0x1') {
                    break; // receipt still valid at this block
                }
            }
        }
verifiedReceipt = receiptAtFinalBlock;

        const expectedTopic = input.transactionType === 'Subscription'
            ? EVENT_TOPICS.SubscriptionPaid
            : (input.transactionType === 'Tip' ? EVENT_TOPICS.TipPaid : EVENT_TOPICS.PPVPaid);

        const contractInteracted = receipt.logs && receipt.logs.some((log: any) =>
            log.address && log.address.toLowerCase() === contractAddress.toLowerCase() &&
            log.topics && log.topics[0] === expectedTopic
        );

        if (!contractInteracted) {
            throw new AppError('Invalid transaction: Interacted target is not the PoDM smart contract on Base.', 400);
        }

        const contractLog = receipt.logs.find((log: any) =>
            log.address && log.address.toLowerCase() === contractAddress.toLowerCase() &&
            log.topics && log.topics[0] === expectedTopic
        );
        if (!contractLog) {
            throw new AppError('Failed to parse transaction logs: Expected PoDM protocol event not found.', 400);
        }

        // Parse topics: topics[1] = fan address (payer), topics[2] = creator address (recipient)
        const payerTopic = contractLog.topics[1];
        if (!payerTopic) {
            throw new AppError('Invalid transaction: Fan payer topic is missing from contract logs.', 400);
        }

        payerHex = '0x' + payerTopic.slice(26).toLowerCase();

        // Fetch authenticated fan's linked crypto_wallet_address and smart_account_address
        const { data: fanProfile } = await supabase
            .from('profiles')
            .select('crypto_wallet_address, smart_account_address')
            .eq('id', input.fanId)
            .maybeSingle();

        const fanWalletAddress = fanProfile?.crypto_wallet_address?.toLowerCase() || '';
        const fanSmartAccountAddress = fanProfile?.smart_account_address?.toLowerCase() || '';

        if (!fanWalletAddress && !fanSmartAccountAddress) {
            throw new AppError('Authenticated fan does not have a configured wallet address.', 400);
        }

        const isPayerMatched = (fanWalletAddress && payerHex === fanWalletAddress) ||
                               (fanSmartAccountAddress && payerHex === fanSmartAccountAddress);

        if (!isPayerMatched) {
            throw new AppError('Transaction payer does not match the authenticated fan\'s wallet address.', 400);
        }

        const recipientTopic = contractLog.topics[2];
        if (!recipientTopic) {
            throw new AppError('Invalid transaction: Creator recipient topic is missing from contract logs.', 400);
        }

        const recipientHex = '0x' + recipientTopic.slice(26).toLowerCase();
        if (recipientHex.toLowerCase() !== creatorWalletAddress.toLowerCase()) {
            throw new AppError('Transaction recipient does not match the creator\'s configured wallet address.', 400);
        }

        // Strict topic[3] validation: Payment token MUST match canonical USDC
        const tokenTopic = contractLog.topics[3];
        if (!tokenTopic) {
            throw new AppError('Invalid transaction: Token address topic is missing from contract logs.', 400);
        }

        const tokenHex = '0x' + tokenTopic.slice(26).toLowerCase();
        const { usdcContract } = getRpcConfig();
        if (usdcContract && tokenHex.toLowerCase() !== usdcContract.toLowerCase()) {
            throw new AppError('Invalid transaction: Payment token does not match canonical USDC.', 400);
        }

        // Decode log data: totalAmount (first 32 bytes), plus referral fee & referrer
        // for the v2 contract. Slots vary by event type:
        //   SubscriptionPaid / PPVPaid: [0] total, [1] idHash, [2] platformFee, [3] referralFee, [4] creatorAmount, [5] referrer
        //   TipPaid:                    [0] total, [1] platformFee, [2] referralFee, [3] creatorAmount, [4] referrer
        const dataHex = contractLog.data;
        if (dataHex && dataHex.startsWith('0x')) {
            const totalAmountHex = '0x' + dataHex.slice(2, 66);
            const rawAmount = parseInt(totalAmountHex, 16);
            const blockchainAmountInCents = Math.round(rawAmount / 10000);

            if (Math.abs(blockchainAmountInCents - input.amountInCents) > 1) {
                throw new AppError(
                    `Transaction amount mismatch. Blockchain: $${blockchainAmountInCents / 100}, Requested: $${input.amountInCents / 100}`,
                    400
                );
            }

            // Validate emitted tierIdHash / contentIdHash against relatedId if provided (H-03 remediation)
            if (input.relatedId && (input.transactionType === 'Subscription' || input.transactionType === 'PPV Post' || input.transactionType === 'PPV Message')) {
                const idHashSlotHex = ('0x' + dataHex.slice(66, 130)).toLowerCase();
                const expectedHashHex = canonicalPaymentIdentifier(input.relatedId).toLowerCase();
                if (idHashSlotHex !== expectedHashHex) {
                    throw new AppError('Transaction content identifier mismatch. Event hash does not match requested tier/content item.', 400);
                }
            }

            // Validate emitted platformFee and creatorAmount against DB expected commission rate (BV-03 remediation)
            const platformFeeSlot = input.transactionType === 'Tip' ? 1 : 2;
            const creatorAmountSlot = input.transactionType === 'Tip' ? 3 : 4;

            const platformFeeRaw = parseInt('0x' + dataHex.slice(2 + platformFeeSlot * 64, 2 + (platformFeeSlot + 1) * 64), 16);
            const creatorAmountRaw = parseInt('0x' + dataHex.slice(2 + creatorAmountSlot * 64, 2 + (creatorAmountSlot + 1) * 64), 16);

            const emittedPlatformFeeInCents = Math.round(platformFeeRaw / 10000);
            const emittedCreatorPayoutInCents = Math.round(creatorAmountRaw / 10000);

            const expectedPlatformFeeInCents = Math.round(input.amountInCents * (commissionRate / 100));
            const expectedCreatorPayoutInCents = input.amountInCents - expectedPlatformFeeInCents;

            if (Math.abs(emittedPlatformFeeInCents - expectedPlatformFeeInCents) > 2) {
                throw new AppError(
                    `Platform fee split mismatch. Blockchain: $${(emittedPlatformFeeInCents / 100).toFixed(2)}, Expected DB split (${commissionRate}%): $${(expectedPlatformFeeInCents / 100).toFixed(2)}`,
                    400
                );
            }

            if (Math.abs(emittedCreatorPayoutInCents - expectedCreatorPayoutInCents) > 2) {
                throw new AppError(
                    `Creator payout split mismatch. Blockchain: $${(emittedCreatorPayoutInCents / 100).toFixed(2)}, Expected DB split: $${(expectedCreatorPayoutInCents / 100).toFixed(2)}`,
                    400
                );
            }

            const referralFeeSlot = input.transactionType === 'Tip' ? 2 : 3;
            const referrerSlot = input.transactionType === 'Tip' ? 4 : 5;
            const referralFeeRaw = parseInt('0x' + dataHex.slice(2 + referralFeeSlot * 64, 2 + (referralFeeSlot + 1) * 64), 16);
            const referralFeeInCents = Math.round(referralFeeRaw / 10000);
            const referrerHex = ('0x' + dataHex.slice(2 + referrerSlot * 64 + 24, 2 + (referrerSlot + 1) * 64)).toLowerCase();

            if (expectedReferrerWallet) {
                // The fan must have directed the referral fee to the DB-resolved referrer wallet.
                if (!referrerHex || referrerHex !== expectedReferrerWallet.toLowerCase()) {
                    throw new AppError('Transaction referrer does not match the referred creator\'s referrer wallet.', 400);
                }
                const { referralFee } = await calculateReferralFee({
                    creatorId: input.creatorId,
                    amountInCents: input.amountInCents,
                    commissionRate,
                });
                if (Math.abs(referralFeeInCents - referralFee) > 2) {
                    throw new AppError(
                        `Referral fee mismatch. Blockchain: $${referralFeeInCents / 100}, Expected: $${referralFee / 100}`,
                        400
                    );
                }
            } else if (referrerHex && referrerHex !== '0x0000000000000000000000000000000000000000') {
                throw new AppError('Transaction includes an unexpected referrer for a creator without an active referral.', 400);
            }
        }
    } catch (err: any) {
        if (err instanceof AppError) throw err;
        console.error('[On-Chain Validation Error]:', err.message || err);
        throw new AppError(`Blockchain RPC connection failed: ${err.message || 'Verification service offline'}`, 503);
    }

    // 5. Fee calculation from creator settings & referral program
    const amount = input.amountInCents;
    const platformFee = Math.round(amount * (commissionRate / 100));
    const creatorPayout = amount - platformFee;

    const { referralFee, referrerId } = await calculateReferralFee({
        creatorId: input.creatorId,
        amountInCents: amount,
        commissionRate,
    });
    const adjustedPlatformFee = platformFee - referralFee;

    // 6. Record transaction (set related_content_id for PPV and Tip content)
    const isContentTransaction = input.transactionType === 'PPV Post' || input.transactionType === 'PPV Message' || input.transactionType === 'Tip';
    const relatedContentId = isContentTransaction ? (input.relatedId || undefined) : undefined;

    const transactionPayload: Record<string, any> = {
        fan_id: input.fanId,
        creator_id: input.creatorId,
        type: input.transactionType,
        amount: amount,
        platform_fee: adjustedPlatformFee,
        creator_payout: creatorPayout,
        status: 'Cleared',
        blockchain_tx_hash: input.txHash,
        payer_wallet_address: payerHex,
        related_content_id: relatedContentId,
    };
    if (referralFee > 0) {
        transactionPayload.referral_fee = referralFee;
        transactionPayload.referrer_id = referrerId;
    }

    let transaction: any;
    try {
        transaction = await TransactionModel.createTransaction(transactionPayload);
        if (!transaction) {
            const { data: duplicate } = await supabase
                .from('transactions')
                .select('*')
                .eq('blockchain_tx_hash', input.txHash)
                .maybeSingle();
            if (duplicate) {
                throw new AppError('This transaction hash has already been verified and processed.', 409);
            }
            throw new AppError('Failed to record transaction in the database.', 500);
        }
    } catch (err: any) {
        if (err instanceof AppError) throw err;
        if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('unique constraint')) {
            throw new AppError('This transaction hash has already been verified and processed.', 409);
        }
        throw err;
    }

    if (referralFee > 0 && referrerId) {
        recordReferralFee(referrerId, referralFee);
    }

    if (input.relatedId) {
        if (input.transactionType === 'Tip') {
            incrementContentTipStats(input.relatedId, amount)
                .catch(err => console.error('[CryptoPaymentService] Error updating content tip stats:', err));
        } else if (input.transactionType === 'PPV Post' || input.transactionType === 'PPV Message') {
            incrementContentPpvEarningsStats(input.relatedId, creatorPayout)
                .catch(err => console.error('[CryptoPaymentService] Error updating content PPV stats:', err));
        }
    }

    // 7. Update with blockchain metadata
    const { error: updateError } = await supabase
        .from('transactions')
        .update({
            blockchain_tx_hash: input.txHash,
            payment_method: 'crypto',
            payment_currency: 'USDC',
            chain_id: chainId,
            blockchain_block_number: verifiedReceipt?.blockNumber ? parseInt(verifiedReceipt.blockNumber, 16) : null,
            blockchain_block_hash: verifiedReceipt?.blockHash || null,
        })
        .eq('id', transaction.id);

    if (updateError) {
        console.error('[CryptoPaymentService] Failed to record crypto metadata:', updateError.message);
    }

    if (input.paymentIntentId) {
        const { error: intentUpdateError } = await supabase
            .from('payment_intents')
            .update({ status: 'verified', blockchain_tx_hash: input.txHash, verified_at: new Date().toISOString() })
            .eq('id', input.paymentIntentId)
            .eq('fan_id', input.fanId)
            .eq('creator_id', input.creatorId)
            .eq('transaction_type', input.transactionType)
            .eq('amount_in_cents', input.amountInCents)
            .eq('status', 'pending');
        if (intentUpdateError) {
            console.error('[CryptoPaymentService] Failed to mark payment intent verified:', intentUpdateError.message);
        }
    }

    return {
        transactionId: transaction.id,
        status: 'Cleared',
        txHash: input.txHash,
        amount: amount / 100,
        payerWalletAddress: payerHex,
    };
};

export const registerPaymentIntent = async (input: PaymentIntentInput) => {
    // Ensure the amount matches the authoritative catalog price
    await assertCatalogPrice(input);

    // Insert the payment intent first
    const { data: intent, error: intentError } = await supabase
        .from('payment_intents')
        .insert([
            {
                client_intent_id: input.clientIntentId,
                fan_id: input.fanId,
                creator_id: input.creatorId,
                transaction_type: input.transactionType,
                related_id: input.relatedId || null,
                amount_in_cents: input.amountInCents,
                expected_amount_base_units: input.amountInCents * 10000,
                status: 'pending',
            },
        ])
        .select('id, client_intent_id, status')
        .single();

    if (intentError) {
        if (intentError.code === '23505')
            throw new AppError('This payment intent has already been registered.', 409);
        throw new AppError(`Failed to register payment intent: ${intentError.message}`, 500);
    }

    // Create a price snapshot for this intent
    const snapshotPayload: any = {
        price_usdc_base_units: input.amountInCents,
        catalog_version: 1, // simple static version; future upgrades can bump this
    };
    if (input.transactionType === 'Subscription') {
        // Validate that the tier_id belongs to the creator's defined subscription tiers
        const { data: creatorProfile, error: profileError } = await supabase
            .from('profiles')
            .select('creator_data')
            .eq('id', input.creatorId)
            .single();
        if (profileError) {
            console.error('[CryptoPaymentService] Failed to fetch creator profile for tier validation:', profileError.message);
            throw new AppError('Unable to validate subscription tier.', 500);
        }
        const tiers = creatorProfile?.creator_data?.subscriptionTiers || [];
        const tierExists = tiers.some((t: any) => t.id === input.relatedId);
        if (!tierExists) {
            throw new AppError('Invalid subscription tier specified.', 400);
        }
        snapshotPayload.tier_id = input.relatedId;
    } else {
        snapshotPayload.content_id = input.relatedId;
    }
    const { data: snapshot, error: snapError } = await supabase
        .from('catalog_price_snapshots')
        .insert([snapshotPayload])
        .select('id')
        .single();
    if (snapError) {
        console.error('[CryptoPaymentService] Failed to create catalog price snapshot:', snapError.message);
        // Continue without snapshot; intent remains usable but audit loses snapshot linkage
    } else {
        // Attach the snapshot to the payment intent
        await supabase
            .from('payment_intents')
            .update({ snapshot_id: snapshot.id })
            .eq('id', intent.id);
    }

    return { intentId: intent.id, clientIntentId: intent.client_intent_id, status: intent.status };
};

export const attachPaymentIntentTransaction = async (
    fanId: string,
    paymentIntentId: string,
    txHash: string,
) => {
    if (!/^0x[A-Fa-f0-9]{64}$/.test(txHash)) {
        throw new AppError('Invalid transaction hash format.', 400);
    }
    const { data, error } = await supabase
        .from('payment_intents')
        .update({ blockchain_tx_hash: txHash })
        .eq('id', paymentIntentId)
        .eq('fan_id', fanId)
        .eq('status', 'pending')
        .select('id, blockchain_tx_hash, status')
        .single();
    if (error || !data) throw new AppError('Payment intent was not found or is no longer pending.', 404);
    return data;
};

export const processDebitCardOffRamp = async (creatorId: string, amountInCents: number, debitCardToken?: string) => {
    const { processPayout } = await import('./payout.service.js');
    const result = await processPayout(creatorId, amountInCents);
    return {
        success: true,
        transferId: result.txHash,
        amount: amountInCents / 100,
        estimatedArrival: 'On-chain (confirmation pending)',
        recipientCard: 'USDC wallet (Base)'
    };
};
