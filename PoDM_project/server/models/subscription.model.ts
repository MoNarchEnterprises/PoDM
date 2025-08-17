import supabase from '../config/supabaseClient';
import { Subscription } from '@common/types/Subscription';

/**
 * Creates a new subscription record in the database.
 * @param subscriptionData - The data for the new subscription.
 * @returns The newly created subscription object.
 */
export const createSubscription = async (subscriptionData: Partial<Subscription>): Promise<Subscription | null> => {
    const { data, error } = await supabase
        .from('subscriptions')
        .insert([subscriptionData])
        .select()
        .single();

    if (error) {
        console.error('Error creating subscription:', error.message);
        return null;
    }
    return data as Subscription;
};

/**
 * Finds a subscription by its unique ID.
 * @param id - The ID of the subscription to find.
 * @returns The subscription object or null if not found.
 */
export const findSubscriptionById = async (id: string): Promise<Subscription | null> => {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error finding subscription by ID:', error.message);
        return null;
    }
    return data as Subscription;
};

/**
 * Finds all active subscriptions for a specific fan.
 * @param fanId - The UUID of the fan.
 * @returns An array of active subscription objects.
 */
export const findActiveSubscriptionsByFan = async (fanId: string): Promise<Subscription[] | null> => {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*, creator:profiles(*)') // Also fetches the creator's profile
        .eq('fan_id', fanId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error finding subscriptions by fan:', error.message);
        return null;
    }
    return data as Subscription[];
};

/**
 * Finds all subscribers for a specific creator.
 * @param creatorId - The UUID of the creator.
 * @returns An array of subscription objects.
 */
export const findSubscriptionsByCreator = async (creatorId: string): Promise<Subscription[] | null> => {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*, fan:profiles(*)') // Also fetches the fan's profile
        .eq('creator_id', creatorId)
        .eq('status', 'active');

    if (error) {
        console.error('Error finding subscriptions by creator:', error.message);
        return null;
    }
    return data as Subscription[];
};

/**
 * Updates a subscription's status or tier.
 * @param id - The ID of the subscription to update.
 * @param updates - An object containing the fields to update.
 * @returns The updated subscription object.
 */
export const updateSubscription = async (id: string, updates: Partial<Subscription>): Promise<Subscription | null> => {
    const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating subscription:', error.message);
        return null;
    }
    return data as Subscription;
};

/**
 * Find subscriptions by fan ID.
 * @param fanId - The UUID of the fan.
 */
export const findSubscriptionsByFanId = async (fanId: string): Promise<Subscription[] | null> => {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('fan_id', fanId);

    if (error) {
        console.error('Error finding subscriptions by fan ID:', error.message);
        return null;
    }
    return data as Subscription[];
};