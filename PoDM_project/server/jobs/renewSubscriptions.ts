import supabase from '../config/supabaseClient';
import * as SubscriptionModel from '../models/subscription.model';
import * as TransactionModel from '../models/transaction.model';
import axios from 'axios';
import { getCommissionRateForCreator } from '../utils/fee.utils';
import { calculateReferralFee, getReferrerWalletForCreator, recordReferralFee } from '../services/referral.service';

const RPC_URL = process.env.BASE_TESTNET_RPC_URL || 'https://sepolia.base.org';
const CONTRACT_ADDRESS = process.env.BASE_TESTNET_CONTRACT_ADDRESS || process.env.BASE_CONTRACT_ADDRESS || '';
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || '';

function computeAmountInUSDC(amountInCents: number): string {
    return '0x' + BigInt(Math.round(amountInCents / 100) * 1_000_000).toString(16);
}

function getUsdcAddress(): string {
    return process.env.NODE_ENV === 'production'
        ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913'
        : '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
}

async function sendRenewalTransaction(
    fanWallet: string,
    creatorWallet: string,
    referrerWallet: string,
    amountInUSDC: string,
    platformFeeBps: number
): Promise<string | null> {
    if (!KEEPER_PRIVATE_KEY || KEEPER_PRIVATE_KEY.length < 64) {
        console.error('[RenewSubscriptions] KEEPER_PRIVATE_KEY not configured.');
        return null;
    }

    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(KEEPER_PRIVATE_KEY, provider);

    const iface = new ethers.Interface([
        'function processRenewal(address tokenAddress, address fan, address creator, uint256 amount, address referrer, uint256 customPlatformFeeBps)',
    ]);
    const data = iface.encodeFunctionData('processRenewal', [
        getUsdcAddress(),
        fanWallet,
        creatorWallet,
        amountInUSDC,
        referrerWallet,
        platformFeeBps,
    ]);

    try {
        const tx = await wallet.sendTransaction({
            to: CONTRACT_ADDRESS,
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

export async function renewSubscriptions(): Promise<void> {
    if (!CONTRACT_ADDRESS) {
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
            console.warn(`[RenewSubscriptions] Renewal failed for sub ${sub.id}. Marking expired.`);
            await SubscriptionModel.updateSubscription(String(sub.id), { status: 'expired', end_date: new Date().toISOString() });
            continue;
        }

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

        await SubscriptionModel.updateSubscription(String(sub.id), {
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

        console.log(`[RenewSubscriptions] Renewed sub ${sub.id}, tx: ${txHash}`);
    }
}

if (require.main === module) {
    renewSubscriptions().then(() => process.exit(0)).catch(() => process.exit(1));
}
