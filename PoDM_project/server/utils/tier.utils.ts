// server/utils/tier.utils.ts

import { v4 as uuidv4 } from 'uuid';
import { SubscriptionTier } from '@common/types/Creator';

/**
 * A centralized utility to prepare subscription tiers.
 * It assigns permanent UUIDs to new tiers.
 * @param tiers - The array of tiers from the frontend, which may contain temporary IDs.
 * @returns A promise that resolves to a new array of tiers with permanent IDs.
 */
export const syncTiersWithStripe = async (tiers: Partial<SubscriptionTier>[]): Promise<SubscriptionTier[]> => {
    if (!tiers || tiers.length === 0) {
        return [];
    }

    const processedTiers = tiers.map((tier) => {
        // Ensure required properties exist
        if (!tier.name || tier.price === undefined) {
            throw new Error('Tier must have at least a name and price');
        }

        let permanentId = tier.id || uuidv4();
        // If the tier has a temporary client-side ID, replace it with a permanent UUID.
        if (tier.id && tier.id.startsWith('new-')) {
            permanentId = uuidv4();
        }

        const finalTierObject: SubscriptionTier = {
            id: permanentId,
            name: tier.name,
            price: tier.price,
            features: tier.features || [],
            subscriberCount: tier.subscriberCount || 0,
            level: tier.level || 1,
            stripePriceId: tier.stripePriceId || 'web3_tier',
        };

        return finalTierObject;
    });

    return processedTiers;
};