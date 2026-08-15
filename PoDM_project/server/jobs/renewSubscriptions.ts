import supabase from '../config/supabaseClient';
import * as SubscriptionModel from '../models/subscription.model';
import * as TransactionModel from '../models/transaction.model';
import { getCommissionRateForCreator } from '../utils/fee.utils';
import { calculateReferralFee, getReferrerWalletForCreator, recordReferralFee } from '../services/referral.service';
import { getContractConfig, encodeProcessRenewal } from '../utils/contract.utils';
import { randomUUID } from 'crypto';

// --- Key isolation: KEEPER_PRIVATE_KEY must be explicitly set in production ---
// DO NOT fall back to DEPLOYER_PRIVATE_KEY in production — it should be in cold storage
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY || '';

// Grace period: max retry attempts before expiring
const MAX_RENEWAL_ATTEMPTS = 3;

function computeAmountInUSDC(amountInCents: number): string {
    const microUsdc = BigInt(Math.round(amountInCents)) * 10_000n;
    return '0x' + microUsdc.toString(16);
}

async function sendRenewalTransaction(
    fanWallet: string,
    creatorWallet: string,
    referrerWallet: string,
    amountInUSDC: string,
    platformFeeBps: number
): Promise<string | null> {
    if (!KEEPER_PRIVATE_KEY || KEEPER_PRIVATE_KEY.length < 64) {
        console.error('[RenewSubscriptions] KEEPER_PRIVATE_KEY not configured. Set a dedicated keeper wallet for production.');
        return null;
    }

    const { contractAddress, rpcUrl, usdcAddress } = getContractConfig();
    if (!contractAddress) {
        console.error('[RenewSubscriptions] Contract address not configured.');
        return null;
    }

    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(KEEPER_PRIVATE_KEY, provider);

    const data = encodeProcessRenewal(
        usdcAddress,
        fanWallet,
        creatorWallet,
        amountInUSDC,
        referrerWallet,
        platformFeeBps
    );

    try {
        const tx = await wallet.sendTransaction({
            to: contractAddress,
            data,
            gasLimit: 200000,
        });
        const receipt = await tx.wait();
        return receipt?.hash || null;
    } catch (err) {
        console.error('[RenewSubscriptions] Failed to process renewal:', err);
        return null;
    }
}

/**
 * Lock content access for a subscription that has failed renewal.
 * Sets renewal_locked_at if not already set, and increments renewal_attempts.
 * After MAX_RENEWAL_ATTEMPTS, the subscription is fully expired.
 */
async function handleFailedRenewal(sub: any, claimId: string): Promise<void> {
    const currentAttempts = (sub.renewal_attempts || 0) + 1;

    if (currentAttempts >= MAX_RENEWAL_ATTEMPTS) {
        // Max retries exhausted — expire the subscription
        console.warn(`[RenewSubscriptions] Sub ${sub.id} failed ${currentAttempts} attempts. Marking expired.`);
        await SubscriptionModel.updateClaimedRenewal(String(sub.id), claimId, {
            status: 'expired',
            end_date: new Date().toISOString(),
            renewal_attempts: currentAttempts,
        });
    } else {
        // Lock content access but keep subscription active for retry
        console.warn(`[RenewSubscriptions] Sub ${sub.id} renewal failed (attempt ${currentAttempts}/${MAX_RENEWAL_ATTEMPTS}). Locking content.`);
        const updatePayload: Record<string, any> = {
            renewal_attempts: currentAttempts,
        };
        // Only set renewal_locked_at on first failure
        if (!sub.renewal_locked_at) {
            updatePayload.renewal_locked_at = new Date().toISOString();
        }
        await SubscriptionModel.updateClaimedRenewal(String(sub.id), claimId, updatePayload);
    }
}

async function verifyRenewalReceipt(
    txHash: string,
    fanWallet: string,
    creatorWallet: string,
    expectedPriceInCents: number
): Promise<boolean> {
    const { contractAddress, rpcUrl } = getContractConfig();
    if (!contractAddress || !rpcUrl) return false;

    try {
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const receipt = await provider.getTransactionReceipt(txHash);

        if (!receipt || receipt.status !== 1) {
            console.error(`[RenewSubscriptions] Transaction receipt missing or failed for tx ${txHash}`);
            return false;
        }

        const latestBlock = await provider.getBlockNumber();
        const minConfirmations = Math.max(1, Number(process.env.BASE_MIN_CONFIRMATIONS || 2));
        if (receipt.blockNumber === undefined || latestBlock - receipt.blockNumber + 1 < minConfirmations) {
            console.warn(`[RenewSubscriptions] Renewal tx ${txHash} is awaiting finality.`);
            return false;
        }

        const renewalEventTopic = ethers.id('SubscriptionRenewed(address,address,uint256,uint256)');

        const renewalLog = receipt.logs.find(
            log =>
                log.address.toLowerCase() === contractAddress.toLowerCase() &&
                log.topics[0] === renewalEventTopic
        );

        if (!renewalLog) {
            console.error(`[RenewSubscriptions] SubscriptionRenewed event log missing in tx ${txHash}`);
            return false;
        }

        const logFan = ('0x' + renewalLog.topics[1].slice(26)).toLowerCase();
        const logCreator = ('0x' + renewalLog.topics[2].slice(26)).toLowerCase();

        if (logFan !== fanWallet.toLowerCase()) {
            console.error(`[RenewSubscriptions] Fan wallet mismatch in renewal log. Expected ${fanWallet}, got ${logFan}`);
            return false;
        }

        if (logCreator !== creatorWallet.toLowerCase()) {
            console.error(`[RenewSubscriptions] Creator wallet mismatch in renewal log. Expected ${creatorWallet}, got ${logCreator}`);
            return false;
        }

        const dataHex = renewalLog.data;
        const amountMicroUsdc = parseInt('0x' + dataHex.slice(2, 66), 16);
        const amountInCents = Math.round(amountMicroUsdc / 10000);

        if (Math.abs(amountInCents - expectedPriceInCents) > 1) {
            console.error(`[RenewSubscriptions] Amount mismatch in renewal log. Expected $${expectedPriceInCents / 100}, got $${amountInCents / 100}`);
            return false;
        }

        return true;
    } catch (err: any) {
        console.error(`[RenewSubscriptions] Error verifying renewal receipt for ${txHash}:`, err.message || err);
        return false;
    }
}

export async function renewSubscriptions(): Promise<void> {
    const { contractAddress } = getContractConfig();
    if (!contractAddress) {
        console.warn('[RenewSubscriptions] Contract address not configured. Skipping.');
        return;
    }

    const dueSubscriptions = await SubscriptionModel.findSubscriptionsDueForRenewal();
    if (!dueSubscriptions || dueSubscriptions.length === 0) {
        console.log('[RenewSubscriptions] No subscriptions due for renewal.');
        return;
    }

    for (const sub of dueSubscriptions) {
        const claimId = randomUUID();
        const claimed = await SubscriptionModel.claimSubscriptionRenewal(String(sub.id), claimId);
        if (!claimed) {
            console.log(`[RenewSubscriptions] Subscription ${sub.id} was claimed by another worker or is no longer due.`);
            continue;
        }
        const claimedSub = { ...sub, renewal_claim_id: claimId };

        const creatorProfile = await supabase
            .from('profiles')
            .select('crypto_wallet_address')
            .eq('id', sub.creator_id)
            .single();

        const creatorWallet = creatorProfile.data?.crypto_wallet_address;
        if (!creatorWallet || !claimedSub.fan_wallet_address) {
            console.warn(`[RenewSubscriptions] Missing wallet for sub ${sub.id}. Marking expired.`);
            await SubscriptionModel.updateClaimedRenewal(String(sub.id), claimId, { status: 'expired', end_date: new Date().toISOString() });
            continue;
        }

        const referrerWallet = await getReferrerWalletForCreator(sub.creator_id);
        const commissionRate = await getCommissionRateForCreator(sub.creator_id);
        const platformFee = Math.round(claimedSub.price * (commissionRate / 100));
        const creatorPayout = claimedSub.price - platformFee;
        const { referralFee, referrerId } = await calculateReferralFee({
            creatorId: sub.creator_id,
            amountInCents: claimedSub.price,
            commissionRate,
        });
        const adjustedPlatformFee = platformFee - referralFee;

        const amountInUSDC = computeAmountInUSDC(claimedSub.price);
        const platformFeeBps = Math.round(commissionRate * 100);
        const txHash = await sendRenewalTransaction(
            claimedSub.fan_wallet_address,
            creatorWallet,
            referrerWallet || '0x0000000000000000000000000000000000000000',
            amountInUSDC,
            platformFeeBps
        );

        if (!txHash) {
            // Renewal failed — lock content and increment attempts
            await handleFailedRenewal(claimedSub, claimId);
            continue;
        }

        const pendingRecorded = await SubscriptionModel.markRenewalPending(String(sub.id), claimId, txHash);
        if (!pendingRecorded) {
            console.error(`[RenewSubscriptions] Could not durably record pending tx ${txHash}; no retry will be attempted automatically.`);
            continue;
        }

        // On-chain event log verification (C-A05 / H-04 remediation)
        const isVerified = await verifyRenewalReceipt(
            txHash,
            claimedSub.fan_wallet_address,
            creatorWallet,
            claimedSub.price
        );

        if (!isVerified) {
            console.warn(`[RenewSubscriptions] On-chain verification failed for renewal tx ${txHash}. Marking attempt failed.`);
            await handleFailedRenewal(claimedSub, claimId);
            continue;
        }

        // Success — record transaction and reset grace period
        const transactionPayload: Record<string, any> = {
            fan_id: claimedSub.fan_id,
            creator_id: claimedSub.creator_id,
            type: 'SubscriptionRenewal' as any,
            amount: claimedSub.price,
            platform_fee: adjustedPlatformFee,
            creator_payout: creatorPayout,
            status: 'Cleared',
            blockchain_tx_hash: txHash,
        };
        if (referralFee > 0) {
            transactionPayload.referral_fee = referralFee;
            transactionPayload.referrer_id = referrerId;
        }

        await TransactionModel.createTransaction(transactionPayload);

        if (referralFee > 0 && referrerId) {
            recordReferralFee(referrerId, referralFee);
        }

        // Reset grace period and extend billing date
        await SubscriptionModel.updateClaimedRenewal(String(sub.id), claimId, {
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            renewal_attempts: 0,
            renewal_locked_at: null,
            renewal_pending_tx_hash: null,
        });

        console.log(`[RenewSubscriptions] Renewed sub ${sub.id}, tx: ${txHash}`);
    }
}

if (require.main === module) {
    renewSubscriptions().then(() => process.exit(0)).catch(() => process.exit(1));
}
