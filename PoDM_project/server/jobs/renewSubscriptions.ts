import supabase from '../config/supabaseClient';
import * as SubscriptionModel from '../models/subscription.model';
import * as TransactionModel from '../models/transaction.model';
import { getCommissionRateForCreator } from '../utils/fee.utils';
import { calculateReferralFee, getReferrerWalletForCreator, recordReferralFee } from '../services/referral.service';
import { getContractConfig, encodeProcessRenewal } from '../utils/contract.utils';

// --- Key isolation: KEEPER_PRIVATE_KEY must be explicitly set in production ---
// DO NOT fall back to DEPLOYER_PRIVATE_KEY in production — it should be in cold storage
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY || '';

// Grace period: max retry attempts before expiring
const MAX_RENEWAL_ATTEMPTS = 3;

function computeAmountInUSDC(amountInCents: number): string {
    return '0x' + BigInt(Math.round(amountInCents / 100) * 1_000_000).toString(16);
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
async function handleFailedRenewal(sub: any): Promise<void> {
    const currentAttempts = (sub.renewal_attempts || 0) + 1;

    if (currentAttempts >= MAX_RENEWAL_ATTEMPTS) {
        // Max retries exhausted — expire the subscription
        console.warn(`[RenewSubscriptions] Sub ${sub.id} failed ${currentAttempts} attempts. Marking expired.`);
        await SubscriptionModel.updateSubscription(String(sub.id), {
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
        await SubscriptionModel.updateSubscription(String(sub.id), updatePayload);
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
        const creatorProfile = await supabase
            .from('profiles')
            .select('crypto_wallet_address')
            .eq('id', sub.creator_id)
            .single();

        const creatorWallet = creatorProfile.data?.crypto_wallet_address;
        if (!creatorWallet || !sub.fan_wallet_address) {
            console.warn(`[RenewSubscriptions] Missing wallet for sub ${sub.id}. Marking expired.`);
            await SubscriptionModel.updateSubscription(String(sub.id), { status: 'expired', end_date: new Date().toISOString() });
            continue;
        }

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

        const amountInUSDC = computeAmountInUSDC(sub.price);
        const platformFeeBps = Math.round(commissionRate * 100);
        const txHash = await sendRenewalTransaction(
            sub.fan_wallet_address,
            creatorWallet,
            referrerWallet || '0x0000000000000000000000000000000000000000',
            amountInUSDC,
            platformFeeBps
        );

        if (!txHash) {
            // Renewal failed — lock content and increment attempts
            await handleFailedRenewal(sub);
            continue;
        }

        // Success — record transaction and reset grace period
        const transactionPayload: Record<string, any> = {
            fan_id: sub.fan_id,
            creator_id: sub.creator_id,
            type: 'SubscriptionRenewal' as any,
            amount: sub.price,
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
        await SubscriptionModel.updateSubscription(String(sub.id), {
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            renewal_attempts: 0,
            renewal_locked_at: null,
        });

        console.log(`[RenewSubscriptions] Renewed sub ${sub.id}, tx: ${txHash}`);
    }
}

if (require.main === module) {
    renewSubscriptions().then(() => process.exit(0)).catch(() => process.exit(1));
}
