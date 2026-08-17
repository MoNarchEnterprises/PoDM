import { ethers } from 'ethers';
import supabase from '../config/supabaseClient';
import * as SubscriptionModel from '../models/subscription.model';
import * as TransactionModel from '../models/transaction.model';
import { getCommissionRateForCreator } from '../utils/fee.utils';
import { calculateReferralFee, getReferrerWalletForCreator, recordReferralFee } from '../services/referral.service';
import { getContractConfig, getChainId, encodeProcessRenewal } from '../utils/contract.utils';
import { randomUUID } from 'crypto';

// --- Key isolation: KEEPER_PRIVATE_KEY must be explicitly set in production ---
// DO NOT fall back to DEPLOYER_PRIVATE_KEY in production — it should be in cold storage
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY || '';

// Grace period: max retry attempts before expiring
const MAX_RENEWAL_ATTEMPTS = 3;

export function computeAmountInUSDC(amountInCents: number): string {
    const microUsdc = BigInt(Math.round(amountInCents)) * 10_000n;
    return '0x' + microUsdc.toString(16);
}

/**
 * Deterministic unique renewal identity per subscription period.
 * Format: renewal:{subscriptionId}:{renewalPeriod}
 */
export function computeRenewalId(subscriptionId: number | string, period: string): string {
    return `renewal:${subscriptionId}:${period}`;
}

/**
 * keccak256 hash of the deterministic renewal identity (bytes32 on-chain).
 */
export function computeRenewalIdHash(renewalId: string): string {
    return ethers.id(renewalId);
}

// Broadcast a renewal and return the tx hash IMMEDIATELY (before waiting for the
// receipt). The caller durably persists this hash before waiting, so an RPC
// timeout on tx.wait() can never lose the on-chain hash and cause a double charge.
async function broadcastRenewalTransaction(
    renewalIdHash: string,
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

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(KEEPER_PRIVATE_KEY, provider);

    const data = encodeProcessRenewal(
        renewalIdHash,
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
        return tx.hash || null;
    } catch (err) {
        console.error('[RenewSubscriptions] Failed to broadcast renewal:', err);
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

export async function verifyRenewalReceipt(
    txHash: string,
    fanWallet: string,
    creatorWallet: string,
    expectedPriceInCents: number,
    expectedRenewalIdHash?: string
): Promise<boolean> {
    const { contractAddress, rpcUrl } = getContractConfig();
    if (!contractAddress || !rpcUrl) return false;

    try {
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

        const renewalEventTopic = ethers.id('SubscriptionRenewed(bytes32,address,address,uint256,uint256)');

        const renewalLog = receipt.logs.find(
            log =>
                log.address.toLowerCase() === contractAddress.toLowerCase() &&
                log.topics[0] === renewalEventTopic
        );

        if (!renewalLog) {
            console.error(`[RenewSubscriptions] SubscriptionRenewed event log missing in tx ${txHash}`);
            return false;
        }

        if (expectedRenewalIdHash && renewalLog.topics[1]) {
            if (renewalLog.topics[1].toLowerCase() !== expectedRenewalIdHash.toLowerCase()) {
                console.error(`[RenewSubscriptions] Renewal ID mismatch in renewal log. Expected ${expectedRenewalIdHash}, got ${renewalLog.topics[1]}`);
                return false;
            }
        }

        const logFan = ('0x' + renewalLog.topics[2].slice(26)).toLowerCase();
        const logCreator = ('0x' + renewalLog.topics[3].slice(26)).toLowerCase();

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

/**
 * Resolve a stored renewal_pending_tx_hash against the chain. Never re-broadcasts.
 * Returns:
 *  - 'completed'  — receipt status 1 + verified event log → renewal finalized
 *  - 'reverted'   — receipt status 0 → tx reverted on-chain, safe to clear + retry
 *  - 'pending'    — no receipt yet (still in mempool / not enough confirmations)
 *  - 'missing'    — hash stored but no receipt after the no-receipt release window
 */
type PendingRenewalOutcome = 'completed' | 'reverted' | 'pending' | 'missing';

async function resolvePendingRenewal(sub: any): Promise<PendingRenewalOutcome> {
    const txHash = sub.renewal_pending_tx_hash;
    if (!txHash) return 'missing';

    const { contractAddress, rpcUrl } = getContractConfig();
    if (!contractAddress || !rpcUrl) return 'pending';

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
        // No receipt yet: the tx is still in the mempool, OR it was never mined.
        // Never release here — wait for the no-receipt window so a slow mining tx
        // can still land without a double charge.
        console.warn(`[RenewSubscriptions] Renewal tx ${txHash} has no receipt yet (sub ${sub.id}).`);
        return 'pending';
    }

    if (receipt.status === 0) {
        console.warn(`[RenewSubscriptions] Renewal tx ${txHash} REVERTED on-chain (sub ${sub.id}). Safe to release.`);
        return 'reverted';
    }

    const creatorWallet = await getCreatorWallet(sub.creator_id);
    if (!creatorWallet) {
        console.error(`[RenewSubscriptions] Creator ${sub.creator_id} has no wallet for pending renewal tx ${txHash}. Leaving for review.`);
        return 'pending';
    }

    const renewalId = sub.renewal_id || computeRenewalId(sub.id, sub.renewal_period || sub.next_billing_date || '');
    const renewalIdHash = renewalId ? computeRenewalIdHash(renewalId) : undefined;

    const isVerified = await verifyRenewalReceipt(
        txHash,
        sub.fan_wallet_address,
        creatorWallet,
        sub.price,
        renewalIdHash
    );
    if (!isVerified) {
        console.error(`[RenewSubscriptions] Pending renewal tx ${txHash} failed event verification. Leaving for review.`);
        return 'pending';
    }

    return 'completed';
}

async function getCreatorWallet(creatorId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('crypto_wallet_address')
        .eq('id', creatorId)
        .single();
    return (error || !data?.crypto_wallet_address) ? null : data.crypto_wallet_address;
}

/**
 * Reconcile subscriptions that have a stored renewal_pending_tx_hash (a previous
 * worker broadcast the renewal but crashed or timed out before completing it).
 * This is the H-04 crash-recovery state machine: find the existing hash, verify
 * its receipt, and either complete the renewal or clear the hash for retry —
 * WITHOUT re-broadcasting.
 */
export async function reconcilePendingRenewals(): Promise<void> {
    const pendingSubs = await SubscriptionModel.findSubscriptionsPendingRenewal();
    if (!pendingSubs || pendingSubs.length === 0) {
        console.log('[RenewSubscriptions] No pending renewal hashes to reconcile.');
        return;
    }

    const noReceiptReleaseMs = parseInt(process.env.RENEWAL_NO_RECEIPT_RELEASE_MS || String(60 * 60 * 1000), 10); // 1 hour

    for (const sub of pendingSubs) {
        try {
            const outcome = await resolvePendingRenewal(sub);

            if (outcome === 'completed') {
                // Funds moved on-chain and the event matches. Finalize the renewal.
                const renewalId = sub.renewal_id || computeRenewalId(sub.id, sub.renewal_period || sub.next_billing_date || '');
                await finalizeSuccessfulRenewal(sub, sub.renewal_pending_tx_hash!, renewalId);
                console.log(`[RenewSubscriptions] Reconciled sub ${sub.id}: completed from existing tx ${sub.renewal_pending_tx_hash}.`);
            } else if (outcome === 'reverted') {
                // Tx reverted on-chain — funds never moved. Clear the hash so the
                // due-renewal path can retry the subscription.
                await SubscriptionModel.clearRenewalPending(String(sub.id), 'Transaction reverted on-chain');
                console.log(`[RenewSubscriptions] Reconciled sub ${sub.id}: tx reverted, cleared pending hash for retry.`);
            } else if (outcome === 'pending') {
                // Still no receipt (or verification inconclusive). If the hash has
                // been waiting past the release window, it was never mined — clear
                // it so the subscription can retry instead of blocking forever.
                const heldMs = Date.now() - new Date(sub.renewal_started_at || sub.updated_at || sub.created_at).getTime();
                if (heldMs >= noReceiptReleaseMs) {
                    await SubscriptionModel.clearRenewalPending(String(sub.id), 'Transaction timed out without receipt');
                    console.warn(`[RenewSubscriptions] Reconciled sub ${sub.id}: pending hash ${sub.renewal_pending_tx_hash} never mined in ${Math.round(heldMs / 60000)} min. Cleared for retry.`);
                } else {
                    console.log(`[RenewSubscriptions] Sub ${sub.id} tx ${sub.renewal_pending_tx_hash} still pending on-chain; deferring.`);
                }
            }
        } catch (reconciliationError: any) {
            console.warn(`[RenewSubscriptions] Failed to reconcile sub ${sub.id}:`, reconciliationError.message || reconciliationError);
        }
    }
}

export async function finalizeSuccessfulRenewal(sub: any, txHash: string, renewalId?: string): Promise<void> {
    // Idempotent: if the transaction row already exists (matched by tx hash or renewal_id), don't duplicate.
    let existing = await TransactionModel.findTransactionByBlockchainTxHash(txHash);
    if (!existing && renewalId) {
        const { data: matchedById } = await supabase
            .from('transactions')
            .select('*')
            .eq('renewal_id', renewalId)
            .maybeSingle();
        if (matchedById) {
            existing = matchedById;
        }
    }

    if (!existing) {
        const creatorWallet = await getCreatorWallet(sub.creator_id);
        const referrerWallet = await getReferrerWalletForCreator(sub.creator_id);
        const commissionRate = await getCommissionRateForCreator(sub.creator_id);
        const platformFee = Math.round(sub.price * (commissionRate / 100));
        const creatorPayout = sub.price - platformFee;
        const { referralFee, referrerId } = await calculateReferralFee({
            creatorId: sub.creator_id,
            amountInCents: sub.price,
            commissionRate,
        });
        const adjustedPlatformFee = platformFee - referralFee;

        const transactionPayload: Record<string, any> = {
            fan_id: sub.fan_id,
            creator_id: sub.creator_id,
            type: 'SubscriptionRenewal' as any,
            amount: sub.price,
            platform_fee: adjustedPlatformFee,
            creator_payout: creatorPayout,
            status: 'Cleared',
            blockchain_tx_hash: txHash,
            renewal_id: renewalId || sub.renewal_id || null,
            payment_method: 'crypto',
            payment_currency: 'USDC',
            chain_id: getChainId(),
        };
        if (referralFee > 0) {
            transactionPayload.referral_fee = referralFee;
            transactionPayload.referrer_id = referrerId;
        }

        try {
            await TransactionModel.createTransaction(transactionPayload);

            if (referralFee > 0 && referrerId) {
                recordReferralFee(referrerId, referralFee);
            }
        } catch (txInsertErr: any) {
            // If duplicate key violation on renewal_id or blockchain_tx_hash, ignore
            console.warn(`[RenewSubscriptions] Transaction row insert caught (possible duplicate):`, txInsertErr.message || txInsertErr);
        }
    }

    // Advance the billing date, set renewal_status to CONFIRMED, clear pending hash + claim, reset attempts.
    await SubscriptionModel.completeRenewal(String(sub.id), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
}

export async function renewSubscriptions(): Promise<void> {
    const { contractAddress } = getContractConfig();
    if (!contractAddress) {
        console.warn('[RenewSubscriptions] Contract address not configured. Skipping.');
        return;
    }

    // Phase 1 — crash recovery: resolve any stored broadcast hashes first, so a
    // worker that crashed after broadcasting never leaves a sub stuck or gets
    // re-broadcast (double charge).
    await reconcilePendingRenewals();

    // Phase 2 — new renewals for due subscriptions without a pending hash.
    const dueSubscriptions = await SubscriptionModel.findSubscriptionsDueForRenewal();
    if (!dueSubscriptions || dueSubscriptions.length === 0) {
        console.log('[RenewSubscriptions] No subscriptions due for renewal.');
        return;
    }

    for (const sub of dueSubscriptions) {
        const period = sub.next_billing_date || new Date().toISOString();
        const renewalId = computeRenewalId(sub.id, period);
        const renewalIdHash = computeRenewalIdHash(renewalId);
        const claimId = randomUUID();

        const claimed = await SubscriptionModel.claimSubscriptionRenewal(
            String(sub.id),
            claimId,
            renewalId,
            period
        );
        if (!claimed) {
            console.log(`[RenewSubscriptions] Subscription ${sub.id} was claimed by another worker or is no longer due.`);
            continue;
        }
        const claimedSub = { ...sub, renewal_claim_id: claimId, renewal_id: renewalId, renewal_period: period };

        const creatorWallet = await getCreatorWallet(sub.creator_id);
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

        // Broadcast and capture the hash IMMEDIATELY (before waiting). If the RPC
        // times out during tx.wait(), the hash is already durably stored and the
        // next worker's reconcilePendingRenewals() resolves it without re-charging.
        const txHash = await broadcastRenewalTransaction(
            renewalIdHash,
            claimedSub.fan_wallet_address,
            creatorWallet,
            referrerWallet || '0x0000000000000000000000000000000000000000',
            amountInUSDC,
            platformFeeBps
        );

        if (!txHash) {
            // Broadcast itself failed (nothing was sent). Lock content and retry later.
            await handleFailedRenewal(claimedSub, claimId);
            continue;
        }

        // Durable pending-hash attach BEFORE waiting on the receipt.
        const pendingRecorded = await SubscriptionModel.markRenewalPending(String(sub.id), claimId, txHash);
        if (!pendingRecorded) {
            console.error(`[RenewSubscriptions] Could not durably record pending tx ${txHash}; manual reconciliation required.`);
            continue;
        }

        // On-chain event log verification (H-04 remediation with renewalIdHash)
        const isVerified = await verifyRenewalReceipt(
            txHash,
            claimedSub.fan_wallet_address,
            creatorWallet,
            claimedSub.price,
            renewalIdHash
        );

        if (!isVerified) {
            // Receipt not yet available (mempool / finality) or verification failed.
            // The hash is already stored — do NOT re-broadcast. Leave it for the
            // reconciliation phase to resolve on the next worker run.
            console.warn(`[RenewSubscriptions] Verification pending/failed for renewal tx ${txHash}; will reconcile on next run.`);
            continue;
        }

        // Success — record transaction and reset grace period
        await finalizeSuccessfulRenewal(claimedSub, txHash, renewalId);

        console.log(`[RenewSubscriptions] Renewed sub ${sub.id}, tx: ${txHash}, renewalId: ${renewalId}`);
    }
}

if (require.main === module) {
    renewSubscriptions().then(() => process.exit(0)).catch((err) => {
        console.error('[RenewSubscriptions] Fatal:', err.message || err);
        process.exit(1);
    });
}