import supabase from '../config/supabaseClient';
import * as TransactionModel from '../models/transaction.model';
import { AppError } from '../middleware/error.middleware';
import { getCommissionRateForCreator } from '../utils/fee.utils';
import { getContractConfig, getChainId, encodeProcessPayout } from '../utils/contract.utils';

// Key isolation: TREASURY_PRIVATE_KEY must be explicitly configured in production.
// DO NOT fall back to DEPLOYER_PRIVATE_KEY — it should be in cold storage after deployment.
const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY || '';
const MIN_PAYOUT_CENTS = parseInt(process.env.MIN_PAYOUT_CENTS || '1000', 10);

export async function processPayout(
    creatorId: string,
    amountInCents: number
): Promise<{ txHash: string }> {
    const { contractAddress, rpcUrl } = getContractConfig();

    if (!TREASURY_PRIVATE_KEY || TREASURY_PRIVATE_KEY.length < 64) {
        throw new AppError('Treasury wallet not configured. Set TREASURY_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY.', 500);
    }
    if (!contractAddress) {
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

    const { data: reservationId, error: reservationError } = await supabase
        .rpc('reserve_payout', { p_creator_id: creatorId, p_amount: amountInCents });

    if (reservationError || !reservationId) {
        const isConflict = reservationError?.message?.toLowerCase().includes('another payout');
        throw new AppError(
            isConflict ? 'Another payout is being processed for this creator. Try again.' : 'Payout amount exceeds the available balance.',
            isConflict ? 409 : 400
        );
    }

    let transactionBroadcast = false;

    try {
        const amountUSDC = BigInt(Math.round(amountInCents)) * 10_000n;

        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(TREASURY_PRIVATE_KEY, provider);

        const data = encodeProcessPayout(profile.crypto_wallet_address, amountUSDC);

        const tx = await wallet.sendTransaction({
            to: contractAddress,
            data,
            gasLimit: 200000,
        });

        transactionBroadcast = true;

        // Attach the broadcast hash to the reservation immediately, before the
        // receipt wait. If the process crashes after broadcast but before
        // complete_payout_reservation, the reservation still carries the hash so
        // the reconcilePayoutReservations job can resolve its on-chain fate
        // (prevents a permanent payout lock for the creator).
        const { error: attachError } = await supabase
            .from('payout_reservations')
            .update({ blockchain_tx_hash: tx.hash })
            .eq('id', reservationId)
            .eq('status', 'pending');
        if (attachError) {
            throw new AppError('Payout was broadcast but its reservation could not be marked with the transaction hash. Manual reconciliation is required.', 500);
        }

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
            blockchain_tx_hash: receipt.hash,
        });

        await supabase
            .from('transactions')
            .update({
                blockchain_tx_hash: receipt.hash,
                payment_method: 'crypto',
                payment_currency: 'USDC',
                chain_id: getChainId(),
            })
            .eq('blockchain_tx_hash', receipt.hash);

        const { error: completeError } = await supabase.rpc('complete_payout_reservation', {
            p_reservation_id: reservationId,
            p_tx_hash: receipt.hash,
        });
        if (completeError) {
            throw new AppError('Payout was broadcast but its reservation could not be finalized. Manual reconciliation is required.', 500);
        }

        return { txHash: receipt.hash };
    } finally {
        // Never release after broadcast: a pending reservation is safer than
        // allowing a second payout if the process crashed after the transfer.
        if (!transactionBroadcast) {
            await supabase.rpc('release_payout_reservation', { p_reservation_id: reservationId });
        }
    }
}

export const payoutService = { processPayout };
