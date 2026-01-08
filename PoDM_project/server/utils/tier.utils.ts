// server/utils/tier.utils.ts

import stripe from '../config/stripeClient';
import { v4 as uuidv4 } from 'uuid';
import { SubscriptionTier } from '@common/types/Creator';

/**
 * A centralized utility to sync an array of subscription tiers with Stripe.
 * It assigns permanent UUIDs to new tiers and creates corresponding prices in Stripe.
 * @param tiers - The array of tiers from the frontend, which may contain temporary IDs.
 * @returns A promise that resolves to a new array of tiers with permanent IDs and stripePriceIds.
 */
export const syncTiersWithStripe = async (tiers: Partial<SubscriptionTier>[]): Promise<SubscriptionTier[]> => {
    if (!tiers || tiers.length === 0) {
        return [];
    }

    const syncedTiers = await Promise.all(
        tiers.map(async (tier) => {
            // Ensure required properties exist
            if (!tier.name || tier.price === undefined) {
                throw new Error('Tier must have at least a name and price');
            }

            let permanentId = tier.id || uuidv4();
            // If the tier has a temporary client-side ID, replace it with a permanent UUID.
            if (tier.id && tier.id.startsWith('new-')) {
                permanentId = uuidv4();
            }

            // If the tier already has a Stripe Price ID, it's already synced. Just ensure its ID is permanent.
            if (tier.stripePriceId) {
                return {
                    ...tier,
                    id: permanentId,
                    name: tier.name,
                    price: tier.price,
                    features: tier.features || [],
                    subscriberCount: tier.subscriberCount || 0,
                    level: tier.level || 1
                } as SubscriptionTier;
            }

            // If it's a new tier, create a corresponding Price in Stripe.
            // If it's a new tier, create a corresponding Price in Stripe.
            // We use product_data to create a One-off product for this tier. 
            // This ensures we don't rely on a global ENV variable that might be missing.
            const stripePrice = await stripe.prices.create({
                currency: 'usd',
                unit_amount: Math.round(tier.price * 100), // Ensure price is in cents
                recurring: { interval: 'month' },
                product_data: {
                    name: tier.name,
                },
                nickname: tier.name, // For reference in the Stripe dashboard
            });

            const finalTierObject: SubscriptionTier = {
                id: permanentId,
                name: tier.name,
                price: tier.price,
                features: tier.features || [],
                subscriberCount: tier.subscriberCount || 0,
                level: tier.level || 1,
                stripePriceId: stripePrice.id,
            };
            console.log(`[Tier Utility] Processed Tier "${tier.name}". Final Object:`, JSON.stringify(finalTierObject, null, 2));
            // --- END CRITICAL DEBUG LOG ---

            return finalTierObject;
        })
    );

    return syncedTiers;
};