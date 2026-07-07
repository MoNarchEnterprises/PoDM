import supabase from '../config/supabaseClient';
import * as SubscriptionModel from '../models/subscription.model';
import * as TransactionModel from '../models/transaction.model';
import axios from 'axios';

const RPC_URL = process.env.BASE_TESTNET_RPC_URL || 'https://sepolia.base.org';
const CONTRACT_ADDRESS = process.env.BASE_TESTNET_CONTRACT_ADDRESS || process.env.BASE_CONTRACT_ADDRESS || '';
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || '';

const PROCESS_RENEWAL_SIG = '0x0f1f5b8a';

function computeAmountInUSDC(amountInCents: number): string {
    return '0x' + BigInt(Math.round(amountInCents / 100) * 1_000_000).toString(16);
}

async function sendRenewalTransaction(fanWallet: string, creatorWallet: string, amountInUSDC: string): Promise<string | null> {
    if (!KEEPER_PRIVATE_KEY || KEEPER_PRIVATE_KEY.length < 64) {
        console.error('[RenewSubscriptions] KEEPER_PRIVATE_KEY not configured.');
        return null;
    }

    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(KEEPER_PRIVATE_KEY, provider);

    const iface = new ethers.Interface([
        'function processRenewal(address fan, address creator, uint256 amount)',
    ]);
    const data = iface.encodeFunctionData('processRenewal', [fanWallet, creatorWallet, amountInUSDC]);

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

        const amountInUSDC = computeAmountInUSDC(sub.price);
        const txHash = await sendRenewalTransaction(sub.fan_wallet_address, creatorWallet, amountInUSDC);

        if (!txHash) {
            console.warn(`[RenewSubscriptions] Renewal failed for sub ${sub.id}. Marking expired.`);
            await SubscriptionModel.updateSubscription(String(sub.id), { status: 'expired', end_date: new Date().toISOString() });
            continue;
        }

        await TransactionModel.createTransaction({
            fan_id: sub.fan_id,
            creator_id: sub.creator_id,
            type: 'SubscriptionRenewal' as any,
            amount: sub.price,
            platform_fee: Math.round(sub.price * 0.125),
            creator_payout: sub.price - Math.round(sub.price * 0.125),
            status: 'Cleared',
            payment_gateway_id: txHash,
        });

        await SubscriptionModel.updateSubscription(String(sub.id), {
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

        console.log(`[RenewSubscriptions] Renewed sub ${sub.id}, tx: ${txHash}`);
    }
}

if (require.main === module) {
    renewSubscriptions().then(() => process.exit(0)).catch(() => process.exit(1));
}
