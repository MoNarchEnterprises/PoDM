// /server/utils/subscription.utils.ts

import { SubscriptionTier } from '@common/types/Creator';
import * as UserModel from '../models/user.model';
import { reshapeUserForApp } from './user.utils';

/**
 * A centralized utility to reshape a raw subscription object from the database
 * into the rich object the frontend expects.
 * @param sub - The raw subscription object from a Supabase query.
 * @returns A promise that resolves to a fully shaped subscription object for the API response.
 */
export const reshapeSubscriptionForApp = async (sub: any) => {
    if (!sub) return null;

    const creator = await UserModel.findUserById(sub.creator_id);
    if (!creator) return null; // Or handle as an error

    const reshapedCreator = reshapeUserForApp(creator);

    const tier = reshapedCreator.creator_data?.subscriptionTiers.find(
        (t: SubscriptionTier) => t.id === sub.tier_id
    );

    const priceInCents = sub.price || (tier ? tier.price * 100 : 0);

    return {
        _id: sub.id,
        fanId: sub.fan_id,
        creatorId: sub.creator_id,
        tierId: sub.tier_id,
        tierName: tier ? tier.name : 'Unknown Tier',
        price: priceInCents / 100,
        billingCycle: sub.billing_cycle,
        status: sub.status,
        startDate: sub.start_date,
        endDate: sub.end_date,
        nextBillingDate: sub.next_billing_date,
        paymentMethod: sub.payment_method,
        createdAt: sub.created_at,
        updatedAt: sub.updated_at,
        creator: reshapedCreator,
        availableTiers: reshapedCreator.creator_data?.subscriptionTiers || [],
    };
};