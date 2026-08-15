import supabase from '../config/supabaseClient';
import { verifyAndRecordBasePayment } from '../services/cryptoPayment.service';

/**
 * Reconciles intents whose transaction hash was attached before a browser
 * closed or lost connectivity. Run this job from the production scheduler.
 */
export async function reconcilePaymentIntents(): Promise<void> {
    const { data: intents, error } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('status', 'pending')
        .not('blockchain_tx_hash', 'is', null)
        .lte('created_at', new Date(Date.now() - 30_000).toISOString())
        .limit(100);

    if (error) throw new Error(`Failed to load payment intents: ${error.message}`);
    for (const intent of intents || []) {
        try {
            await verifyAndRecordBasePayment({
                txHash: intent.blockchain_tx_hash,
                fanId: intent.fan_id,
                creatorId: intent.creator_id,
                amountInCents: intent.amount_in_cents,
                transactionType: intent.transaction_type,
                relatedId: intent.related_id || undefined,
                paymentIntentId: intent.id,
            });
        } catch (reconciliationError: any) {
            // Pending receipts remain retryable; malformed/failed transactions
            // are retained for operational review instead of being cleared.
            console.warn(`[PaymentIntentReconciler] Intent ${intent.id} not reconciled:`, reconciliationError.message || reconciliationError);
        }
    }
}

if (require.main === module) {
    reconcilePaymentIntents().then(() => process.exit(0)).catch(() => process.exit(1));
}
