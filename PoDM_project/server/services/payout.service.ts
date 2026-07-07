import supabase from '../config/supabaseClient';
import * as TransactionModel from '../models/transaction.model';
import { AppError } from '../middleware/error.middleware';
import { getCommissionRateForCreator } from '../utils/fee.utils';

const RPC_URL = process.env.BASE_TESTNET_RPC_URL || 'https://sepolia.base.org';
const CONTRACT_ADDRESS = process.env.BASE_TESTNET_CONTRACT_ADDRESS || process.env.BASE_CONTRACT_ADDRESS || '';
const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || '';
const MIN_PAYOUT_CENTS = parseInt(process.env.MIN_PAYOUT_CENTS || '1000', 10);

async function getAvailableBalance(creatorId: string): Promise<number> {
    const { data, error } = await supabase
        .from('transactions')
        .select('creator_payout')
        .in('type', ['Subscription', 'Tip', 'PPV Message', 'PPV Post', 'SubscriptionRenewal'])
        .eq('creator_id', creatorId)
        .eq('status', 'Cleared');

    if (error) throw new AppError(`Failed to query earnings: ${error.message}`, 500);

    const earnings = (data || []).reduce((sum, tx) => sum + (tx.creator_payout || 0), 0);

    const { data: payoutData, error: payoutError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('creator_id', creatorId)
        .eq('type', 'Payout')
        .eq('status', 'Cleared');

    if (payoutError) throw new AppError(`Failed to query payouts: ${payoutError.message}`, 500);

    const totalPaidOut = (payoutData || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);

    return earnings - totalPaidOut;
}

export async function processPayout(
    creatorId: string,
    amountInCents: number
): Promise<{ txHash: string }> {
    if (!TREASURY_PRIVATE_KEY || TREASURY_PRIVATE_KEY.length < 64) {
        throw new AppError('Treasury wallet not configured. Set TREASURY_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY.', 500);
    }
    if (!CONTRACT_ADDRESS) {
        throw new AppError('Contract address not configured. Set BASE_TESTNET_CONTRACT_ADDRESS or BASE_CONTRACT_ADDRESS.', 500);
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('crypto_wallet_address')
        .eq('id', creatorId)
        .single();

    if (profileError || !profile?.crypto_wallet_address) {
        throw new AppError('Creator has not configured their payout wallet address.', 400);
    }

    if (amountInCents < MIN_PAYOUT_CENTS) {
        throw new AppError(`Minimum payout is $${(MIN_PAYOUT_CENTS / 100).toFixed(2)}.`, 400);
    }

    const available = await getAvailableBalance(creatorId);
    if (amountInCents > available) {
        throw new AppError(
            `Insufficient balance. Available: $${(available / 100).toFixed(2)}, Requested: $${(amountInCents / 100).toFixed(2)}.`,
            400
        );
    }

    const { error: lockError } = await supabase
        .rpc('acquire_payout_lock', { p_creator_id: creatorId });

    if (lockError) {
        throw new AppError('Another payout is being processed for this creator. Try again.', 409);
    }

    try {
        const amountUSDC = BigInt(Math.round(amountInCents / 100) * 1_000_000);

        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(TREASURY_PRIVATE_KEY, provider);

        const iface = new ethers.Interface([
            'function processPayout(address creator, uint256 amount)',
        ]);
        const data = iface.encodeFunctionData('processPayout', [profile.crypto_wallet_address, amountUSDC]);

        const tx = await wallet.sendTransaction({
            to: CONTRACT_ADDRESS,
            data,
            gasLimit: 200000,
        });

        const receipt = await tx.wait();
        if (!receipt?.hash) {
            throw new AppError('Payout transaction failed on-chain.', 500);
        }

        await TransactionModel.createTransaction({
            fan_id: creatorId,
            creator_id: creatorId,
            type: 'Payout' as any,
            amount: amountInCents,
            platform_fee: 0,
            creator_payout: -amountInCents,
            status: 'Cleared',
            payment_gateway_id: receipt.hash,
        });

        await supabase
            .from('transactions')
            .update({
                blockchain_tx_hash: receipt.hash,
                payment_method: 'crypto',
                payment_currency: 'USDC',
                chain_id: 84532,
            })
            .eq('payment_gateway_id', receipt.hash);

        return { txHash: receipt.hash };
    } finally {
        await supabase.rpc('release_payout_lock', { p_creator_id: creatorId });
    }
}

export const payoutService = { processPayout };
