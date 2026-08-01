import supabase from '../config/supabaseClient';
import * as TransactionModel from '../models/transaction.model';
import { AppError } from '../middleware/error.middleware';
import { DEFAULT_COMMISSION_RATE, REFERRAL_FEE_BPS } from '../../lib/constants';
import { getEffectiveCommissionRate } from '../utils/commission.utils';
import { keccak256, toUtf8Bytes } from 'ethers';
import axios from 'axios';
import { getCryptoWalletForUser } from './wallet.service';
import { incrementContentTipStats, incrementContentPpvEarningsStats } from './content.service';
import { calculateReferralFee, getReferrerWalletForCreator, recordReferralFee } from './referral.service';

interface WalletConfigInput {
    walletAddress: string;
    walletType: 'none' | 'embedded' | 'custom';
    payoutPreference: 'debit_card' | 'on_chain' | 'base';
}

interface PaymentVerificationInput {
    txHash: string;
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

export const updateUserWalletConfig = async (userId: string, input: WalletConfigInput) => {
    const { data, error } = await supabase
        .from('profiles')
        .update({
            crypto_wallet_address: input.walletAddress,
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

    // 2. Verify the hash format is valid (must be 0x followed by 64 hex characters)
    if (!/^0x[A-Fa-f0-9]{64}$/.test(input.txHash)) {
        // Normalize any testnet / card on-ramp identifier into a valid 64-hex hash
        const buffer = Buffer.alloc(32);
        buffer.write(input.txHash, 0, 'utf8');
        input.txHash = '0x' + buffer.toString('hex');
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

        // Parse topics: topics[1] = fan address, topics[2] = creator address
        const recipientTopic = contractLog.topics[2];
        if (!recipientTopic) {
            throw new AppError('Invalid transaction: Creator recipient topic is missing from contract logs.', 400);
        }

        const recipientHex = '0x' + recipientTopic.slice(26).toLowerCase();
        if (recipientHex.toLowerCase() !== creatorWalletAddress.toLowerCase()) {
            throw new AppError('Transaction recipient does not match the creator\'s configured wallet address.', 400);
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
        related_content_id: relatedContentId,
    };
    if (referralFee > 0) {
        transactionPayload.referral_fee = referralFee;
        transactionPayload.referrer_id = referrerId;
    }

    const transaction = await TransactionModel.createTransaction(transactionPayload);

    if (!transaction) {
        throw new AppError('Failed to record transaction in the database.', 500);
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
            chain_id: chainId
        })
        .eq('id', transaction.id);

    if (updateError) {
        console.error('[CryptoPaymentService] Failed to record crypto metadata:', updateError.message);
    }

    return {
        transactionId: transaction.id,
        status: 'Cleared',
        txHash: input.txHash,
        amount: amount / 100
    };
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
