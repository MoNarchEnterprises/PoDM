import { ethers } from 'ethers';
import supabase from '../config/supabaseClient';
import * as TransactionModel from '../models/transaction.model';
import { getContractConfig, getChainId } from '../utils/contract.utils';

/**
 * Reconciles payout reservations that were left 'pending' after the backend
 * crashed or lost connectivity between the on-chain broadcast and
 * complete_payout_reservation. Without this job, a stuck pending reservation
 * permanently blocks that creator from ever being paid out again (the partial
 * unique index payout_reservations_one_pending_per_creator holds forever).
 *
 * Resolution per reservation (older than a grace window so in-flight payouts
 * are never touched):
 * - reservation has a blockchain_tx_hash (payout.service.ts attaches it right
 *   after broadcast): fetch the on-chain receipt.
 *     * receipt status 1  -> funds moved -> backfill the Payout transaction row
 *       if missing, then complete_payout_reservation.
 *     * receipt status 0  -> tx reverted -> release_payout_reservation.
 *     * no receipt yet    -> tx still pending on-chain; leave for a later run.
 * - reservation has NO hash (crashed before the attach write): scan the contract
 *   for PayoutCompleted events addressed to the creator's wallet in the
 *   reservation's time window; if found -> complete with that tx hash, else
 *   release.
 *
 * Run this job from the production scheduler, matching reconcilePaymentIntents.
 */
const GRACE_MS = parseInt(process.env.PAYOUT_RESERVATION_GRACE_MS || '300000', 10); // 5 min: don't touch in-flight payouts
const BATCH_LIMIT = parseInt(process.env.PAYOUT_RESERVATION_BATCH_LIMIT || '100', 10);
// A broadcast tx with no receipt after this long is presumed dropped from the
// mempool (Base blocks ~2s). Releasing it cannot double-pay because it never mined.
const NO_RECEIPT_RELEASE_MS = parseInt(process.env.PAYOUT_RESERVATION_NO_RECEIPT_RELEASE_MS || '3600000', 10); // 1 hour

interface PendingReservation {
    id: string;
    creator_id: string;
    amount: number;
    blockchain_tx_hash: string | null;
    created_at: string;
}

async function resolveByReceipt(provider: ethers.JsonRpcProvider, reservation: PendingReservation): Promise<'completed' | 'released' | 'deferred'> {
    const receipt = await provider.getTransactionReceipt(reservation.blockchain_tx_hash!);
    if (!receipt) {
        // Still pending in the mempool (or dropped but not yet observable).
        // Never release a transaction that might still mine; defer instead.
        console.warn(`[PayoutReservationReconciler] Reservation ${reservation.id} tx ${reservation.blockchain_tx_hash} has no receipt yet; deferring.`);
        return 'deferred';
    }

    if (receipt.status === 0) {
        console.log(`[PayoutReservationReconciler] Reservation ${reservation.id} tx ${reservation.blockchain_tx_hash} REVERTED on-chain. Releasing reservation.`);
        const { error } = await supabase.rpc('release_payout_reservation', { p_reservation_id: reservation.id });
        if (error) throw new Error(`release failed: ${error.message}`);
        return 'released';
    }

    // Success: funds moved. Backfill the Payout transaction row if the crash
    // happened before it was created, then complete the reservation.
    await ensurePayoutTransaction(reservation, reservation.blockchain_tx_hash!);
    const { error } = await supabase.rpc('complete_payout_reservation', {
        p_reservation_id: reservation.id,
        p_tx_hash: reservation.blockchain_tx_hash,
    });
    if (error) throw new Error(`complete failed: ${error.message}`);
    console.log(`[PayoutReservationReconciler] Reservation ${reservation.id} COMPLETED (tx ${reservation.blockchain_tx_hash} succeeded on-chain).`);
    return 'completed';
}

async function ensurePayoutTransaction(reservation: PendingReservation, txHash: string): Promise<void> {
    const existing = await TransactionModel.findTransactionByBlockchainTxHash(txHash);
    if (existing) return;
    await TransactionModel.createTransaction({
        fan_id: reservation.creator_id,
        creator_id: reservation.creator_id,
        type: 'Payout' as any,
        amount: reservation.amount,
        platform_fee: 0,
        creator_payout: -reservation.amount,
        status: 'Cleared',
        blockchain_tx_hash: txHash,
        payment_method: 'crypto',
        payment_currency: 'USDC',
        chain_id: getChainId(),
    });
}

async function resolveByEventScan(provider: ethers.JsonRpcProvider, reservation: PendingReservation, creatorWallet: string): Promise<'completed' | 'released'> {
    const { contractAddress } = getContractConfig();

    // Scan from an estimate of the reservation's creation block to now.
    const latest = await provider.getBlockNumber();
    const createdMs = new Date(reservation.created_at).getTime();
    const elapsedBlocks = Math.ceil((Date.now() - createdMs) / 2000); // ~2s Base block time
    const fromBlock = Math.max(latest - elapsedBlocks - 5, 1);

    const payoutTopic = ethers.id('PayoutCompleted(address,uint256)');
    const logs = await provider.getLogs({
        address: contractAddress,
        fromBlock,
        toBlock: 'latest',
        topics: [payoutTopic, ethers.zeroPadValue(creatorWallet.toLowerCase(), 32)],
    });

    // Decode the amount from the raw event data (indexed creator = topics[1],
    // amount = uint256 in data) rather than parseLog, so we don't need the full
    // ABI here and stay resilient to extra indexed fields.
    const match = logs.find(log => {
        const amountMicro = BigInt('0x' + log.data.slice(2, 66));
        const amountInCents = Math.round(Number(amountMicro) / 10000);
        return Math.abs(amountInCents - reservation.amount) <= 1;
    });

    if (match) {
        const txHash = match.transactionHash;
        await ensurePayoutTransaction(reservation, txHash);
        const { error } = await supabase.rpc('complete_payout_reservation', { p_reservation_id: reservation.id, p_tx_hash: txHash });
        if (error) throw new Error(`complete failed: ${error.message}`);
        console.log(`[PayoutReservationReconciler] Reservation ${reservation.id} COMPLETED via PayoutCompleted event scan (tx ${txHash}).`);
        return 'completed';
    }

    const { error } = await supabase.rpc('release_payout_reservation', { p_reservation_id: reservation.id });
    if (error) throw new Error(`release failed: ${error.message}`);
    console.log(`[PayoutReservationReconciler] Reservation ${reservation.id} RELEASED (no PayoutCompleted event found for creator).`);
    return 'released';
}

export async function reconcilePayoutReservations(): Promise<void> {
    const { rpcUrl } = getContractConfig();
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const cutoff = new Date(Date.now() - GRACE_MS).toISOString();
    const { data: reservations, error } = await supabase
        .from('payout_reservations')
        .select('id, creator_id, amount, blockchain_tx_hash, created_at')
        .eq('status', 'pending')
        .lte('created_at', cutoff)
        .limit(BATCH_LIMIT);

    if (error) throw new Error(`Failed to load pending payout reservations: ${error.message}`);

    for (const reservation of (reservations || []) as PendingReservation[]) {
        try {
            if (reservation.blockchain_tx_hash) {
                const outcome = await resolveByReceipt(provider, reservation);
                if (outcome === 'deferred') {
                    // No receipt yet: the tx is still pending in the mempool or was
                    // dropped. Hold it for a bounded window so a slow tx can mine;
                    // after NO_RECEIPT_RELEASE_MS it is presumed dropped and never
                    // mined, so releasing cannot double-pay. This prevents creators
                    // from being blocked forever by a never-confirming hash.
                    const heldMs = Date.now() - new Date(reservation.created_at).getTime();
                    if (heldMs >= NO_RECEIPT_RELEASE_MS) {
                        const { error: relErr } = await supabase.rpc('release_payout_reservation', { p_reservation_id: reservation.id });
                        if (relErr) throw new Error(`release failed: ${relErr.message}`);
                        console.warn(`[PayoutReservationReconciler] Reservation ${reservation.id} tx never got a receipt in ${Math.round(heldMs/60000)} min; released as dropped.`);
                    }
                }
                continue;
            }

            // No hash attached — crashed before the attach write. Resolve via the
            // on-chain PayoutCompleted event so we never release funds that moved.
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('crypto_wallet_address')
                .eq('id', reservation.creator_id)
                .single();
            if (profileError || !profile?.crypto_wallet_address) {
                console.warn(`[PayoutReservationReconciler] Creator ${reservation.creator_id} has no wallet address; cannot resolve reservation ${reservation.id}. Leaving pending for review.`);
                continue;
            }
            await resolveByEventScan(provider, reservation, profile.crypto_wallet_address);
        } catch (reconciliationError: any) {
            console.warn(`[PayoutReservationReconciler] Reservation ${reservation.id} not reconciled:`, reconciliationError.message || reconciliationError);
        }
    }

    await provider.destroy();
}

if (require.main === module) {
    reconcilePayoutReservations()
        .then(() => {
            // Do not call process.exit() here: on Windows, exiting while the
            // ethers provider's keep-alive sockets are mid-close triggers a
            // libuv UV_HANDLE_CLOSING assertion. Set exit code and let the
            // event loop drain naturally (all handles are destroyed by now).
            process.exitCode = 0;
            setTimeout(() => {}, 5000).unref();
        })
        .catch((err) => {
            console.error('[PayoutReservationReconciler] Fatal:', err.message || err);
            process.exit(1);
        });
}