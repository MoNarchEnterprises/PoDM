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

export const countTotalActiveSubscribersAtDate = async (creatorId: string, date: Date): Promise<number> => {
    return handleCount(
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('creator_id', creatorId).lte('created_at', date.toISOString()).or(`end_date.is.null,end_date.gt.${date.toISOString()}`),
        'count total active subscribers at date'
    );
};
