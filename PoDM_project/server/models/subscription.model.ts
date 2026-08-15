import supabase from '../config/supabaseClient';
import { Subscription } from '@common/types/Subscription';
import { handleQuery, handleCount, handleList } from '../utils/database';

export const createSubscription = async (subscriptionData: Partial<Subscription>): Promise<Subscription | null> => {
    return handleQuery<Subscription>(
        supabase.from('subscriptions').insert([subscriptionData]).select().single(),
        'create subscription'
    );
};

export const findSubscriptionById = async (id: number): Promise<Subscription | null> => {
    return handleQuery<Subscription>(
        supabase.from('subscriptions').select('*').eq('id', id).single(),
        'find subscription by ID', id
    );
};

export const findActiveSubscriptionsByFan = async (fanId: string): Promise<Subscription[] | null> => {
    return handleList<Subscription>(
        supabase.from('subscriptions').select('*, creator:creator_id(*)').eq('fan_id', fanId).eq('status', 'active').order('created_at', { ascending: false }),
        'find subscriptions by fan'
    );
};

export const findSubscriptionsByCreator = async (creatorId: string): Promise<Subscription[] | null> => {
    return handleList<Subscription>(
        supabase.from('subscriptions').select('*, fan:fan_id(id, username, avatar_url)').eq('creator_id', creatorId).eq('status', 'active'),
        'find subscriptions by creator'
    );
};

export const countNewSubscribersInPeriod = async (creatorId: string, startDate: Date, endDate?: Date): Promise<number> => {
    let query = supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorId)
        .eq('status', 'active')
        .gte('created_at', startDate.toISOString());

    if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
    }

    return handleCount(query, 'count new subscribers in period');
};

export const updateSubscription = async (id: string, updates: Partial<Subscription>): Promise<Subscription | null> => {
    return handleQuery<Subscription>(
        supabase.from('subscriptions').update(updates).eq('id', id).select().single(),
        'update subscription', id
    );
};

export const findSubscriptionsByFanId = async (fanId: string): Promise<Subscription[] | null> => {
    return handleList<Subscription>(
        supabase.from('subscriptions').select('*').eq('fan_id', fanId).order('created_at', { ascending: false }),
        'find subscriptions by fan ID'
    );
};

export const countAllNewSubscribersInPeriod = async (startDate: Date): Promise<number> => {
    return handleCount(
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', startDate.toISOString()),
        'count all new subscribers in period'
    );
};

export const findSubscriptionsDueForRenewal = async (): Promise<Subscription[] | null> => {
    return handleList<Subscription>(
        supabase.from('subscriptions')
            .select('*')
            .eq('status', 'active')
            .lte('next_billing_date', new Date().toISOString())
            .is('renewal_pending_tx_hash', null)
            .not('fan_wallet_address', 'is', null),
        'find subscriptions due for renewal'
    );
};

/**
 * Subscriptions with a stored renewal_pending_tx_hash — a worker broadcast the
 * renewal on-chain but crashed (or timed out) before completing it. These must be
 * reconciled by verifying the existing hash's receipt, never re-broadcast.
 */
export const findSubscriptionsPendingRenewal = async (): Promise<Subscription[] | null> => {
    return handleList<Subscription>(
        supabase.from('subscriptions')
            .select('*')
            .eq('status', 'active')
            .not('renewal_pending_tx_hash', 'is', null),
        'find subscriptions pending renewal reconciliation'
    );
};

export const claimSubscriptionRenewal = async (subscriptionId: string, claimId: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('claim_subscription_renewal', {
        p_subscription_id: Number(subscriptionId),
        p_claim_id: claimId,
    });
    if (error) throw new Error(`Failed to claim subscription renewal: ${error.message}`);
    return data === true;
};

export const updateClaimedRenewal = async (
    subscriptionId: string,
    claimId: string,
    updates: Partial<Subscription>
): Promise<Subscription | null> => {
    return handleQuery<Subscription>(
        supabase.from('subscriptions')
            .update({ ...updates, renewal_claim_id: null, renewal_claimed_at: null })
            .eq('id', subscriptionId)
            .eq('renewal_claim_id', claimId)
            .select()
            .single(),
        'update claimed subscription renewal', subscriptionId
    );
};

export const markRenewalPending = async (subscriptionId: string, claimId: string, txHash: string): Promise<boolean> => {
    const { data, error } = await supabase.from('subscriptions')
        .update({ renewal_pending_tx_hash: txHash })
        .eq('id', subscriptionId)
        .eq('renewal_claim_id', claimId)
        .select('id')
        .single();
    return !error && Boolean(data);
};

/**
 * Complete a renewal after on-chain verification: clear the pending hash and
 * claim, advance the billing date, reset the retry counter and unlock content.
 * Used by both the happy path and the reconciliation path (crash recovery).
 */
export const completeRenewal = async (subscriptionId: string, nextBillingDate: string): Promise<Subscription | null> => {
    return handleQuery<Subscription>(
        supabase.from('subscriptions')
            .update({
                next_billing_date: nextBillingDate,
                renewal_attempts: 0,
                renewal_locked_at: null,
                renewal_pending_tx_hash: null,
                renewal_claim_id: null,
                renewal_claimed_at: null,
            })
            .eq('id', subscriptionId)
            .select()
            .single(),
        'complete subscription renewal', subscriptionId
    );
};

/**
 * Clear a stored pending tx hash when the on-chain receipt proves the tx never
 * moved funds (status 0 revert) or never mined. Releases the claim so the
 * subscription can be retried (or the failed-renewal path can lock/expire it).
 */
export const clearRenewalPending = async (subscriptionId: string): Promise<Subscription | null> => {
    return handleQuery<Subscription>(
        supabase.from('subscriptions')
            .update({ renewal_pending_tx_hash: null })
            .eq('id', subscriptionId)
            .select()
            .single(),
        'clear pending renewal tx hash', subscriptionId
    );
};

export const findSubscriptionByFanAndCreator = async (fanId: string, creatorId: string): Promise<Subscription | null> => {
    return handleQuery<Subscription>(
        supabase.from('subscriptions')
            .select('*')
            .eq('fan_id', fanId)
            .eq('creator_id', creatorId)
            .eq('status', 'active')
            .single(),
        'find subscription by fan and creator'
    );
};

export const countTotalActiveSubscribersAtDate = async (creatorId: string, date: Date): Promise<number> => {
    return handleCount(
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('creator_id', creatorId).lte('created_at', date.toISOString()).or(`end_date.is.null,end_date.gt.${date.toISOString()}`),
        'count total active subscribers at date'
    );
};
