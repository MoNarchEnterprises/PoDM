import stripe from '../config/stripeClient';
import * as SubscriptionModel from '../models/subscription.model';
import * as UserModel from '../models/user.model';
import { AppError } from '../middleware/error.middleware';
import { Subscription } from '@common/types/Subscription';
import { User } from '@common/types/User';
import { reshapeUserForApp } from '../utils/user.utils';
import { getOrCreateStripeCustomer } from '../utils/stripe.utils';

/**
 * Creates a new subscription for an authenticated fan. This is the primary service
 * for all subscription creations, used by both new signups and existing users.
 * @param fanId - The ID of the fan who is subscribing.
 * @param creatorId - The ID of the creator being subscribed to.
 * @param tierId - The internal ID of the subscription tier.
 * @param paymentMethodId - The Stripe Payment Method ID from the frontend.
 * @returns An object with the new subscription and a client secret if 3D Secure is needed.
 */
export const createSubscriptionForUser = async (
    fanId: string, 
    creatorId: string, 
    tierId: string, 
    paymentMethodId: string
) => {
    console.log(`[SubService] Starting subscription creation for fan ${fanId} to creator ${creatorId}`);
    
    // 1. Fetch creator and validate the selected tier
    const creator = await UserModel.findUserById(creatorId);
    if (!creator || !creator.creator_data?.subscriptionTiers) {
        throw new AppError('Creator or their subscription tiers not found.', 404);
    }

    console.log(`[SubService] Found creator ${creatorId} with ${creator.creator_data.subscriptionTiers}`);
    console.log(`[SubService] Looking for tier ID: ${tierId}`);
    const tier = creator.creator_data.subscriptionTiers.find((t: any) => t.id === tierId);
    if (!tier || !tier.stripePriceId) {
        throw new AppError('Selected subscription tier is invalid or missing a Stripe Price ID.', 400);
    }

    // 2. Get or create the Stripe Customer ID for the fan
    const fanStripeCustomerId = await getOrCreateStripeCustomer(fanId);
    console.log(`[SubService] Confirmed Stripe Customer ID: ${fanStripeCustomerId}`);

    try {
        // 3. Attach payment method and set it as default for future invoices
        await stripe.paymentMethods.attach(paymentMethodId, { customer: fanStripeCustomerId });
        await stripe.customers.update(fanStripeCustomerId, {
            invoice_settings: { default_payment_method: paymentMethodId },
        });

        // 4. Create the subscription in Stripe
        const stripeSubscription = await stripe.subscriptions.create({
            customer: fanStripeCustomerId,
            items: [{ price: tier.stripePriceId }],
            expand: ['latest_invoice.payment_intent'],
            metadata: { 
                pod_fan_id: fanId, 
                pod_creator_id: creatorId, 
                pod_tier_id: tierId 
            }
        });
        console.log(`[SubService] Stripe subscription ${stripeSubscription.id} created.`);

        // 5. Handle potential 3D Secure authentication requirement
        const latestInvoice = (stripeSubscription as any).latest_invoice;
        const paymentIntent = latestInvoice?.payment_intent;

        if (paymentIntent?.status === 'requires_action') {
            console.log(`[SubService] 3D Secure required for subscription ${stripeSubscription.id}.`);
            return {
                requiresAction: true,
                clientSecret: paymentIntent.client_secret,
                subscriptionId: stripeSubscription.id,
            };
        }

        console.log('[SubService] Stripe subscription created.', JSON.stringify(stripeSubscription, null, 2));

        const periodStart = latestInvoice.period_start;
        const periodEnd = latestInvoice.period_end;

        if (!periodStart || !periodEnd) {
            // This is a safety net in case the invoice is malformed, which is highly unlikely.
            throw new AppError("Could not determine subscription period from Stripe invoice.", 500);
        }

        // 6. If payment is successful immediately, save the subscription to our database
        const dbSubscription = await SubscriptionModel.createSubscription({
            stripe_subscription_id: stripeSubscription.id,
            fan_id: fanId,
            creator_id: creatorId,
            tier_id: tierId,
            status: 'active',
            start_date: new Date(periodStart * 1000).toISOString(),
            end_date: null,
            next_billing_date: new Date(periodEnd * 1000).toISOString(),
        });

        if (!dbSubscription) {
             // CRITICAL: If our DB save fails, we must cancel the Stripe subscription to avoid charging the user.
             await stripe.subscriptions.cancel(stripeSubscription.id);
             throw new AppError('Failed to save subscription to database after successful payment.', 500);
        }
        console.log(`[SubService] Subscription ${dbSubscription.id} saved to local database.`);

        return { 
            requiresAction: false, 
            subscription: dbSubscription 
        };

    } catch (error: any) {
        console.error("Stripe subscription creation error:", error);
        throw new AppError(`Stripe Error: ${error.message}`, 500);
    }
};

/**
 * Retrieves all subscriptions for a given fan and enriches them with creator data.
 * @param fanId - The UUID of the fan.
 * @returns An array of the fan's subscriptions, each including the creator's profile and available tiers.
 */
export const getFanSubscriptions = async (fanId: string) => {
    const subscriptions = await SubscriptionModel.findSubscriptionsByFanId(fanId);
    if (!subscriptions) return [];

    const subscriptionsWithCreators = await Promise.all(
        subscriptions.map(async (sub) => {
            const creator = await UserModel.findUserById(sub.creator_id);
            if (!creator) return null;
            
            const reshapedCreator = reshapeUserForApp(creator);

            return {
                ...sub,
                _id: sub.id,
                creator: reshapedCreator,
                availableTiers: reshapedCreator.creatorData?.subscriptionTiers || [],
            };
        })
    );
    
    return subscriptionsWithCreators.filter(sub => sub !== null);
};

/**
 * Retrieves all active subscribers for a given creator.
 * @param creatorId - The UUID of the creator.
 * @returns An array of the creator's active subscriptions with fan details.
 */
export const getCreatorSubscribers = async (creatorId: string): Promise<(Subscription & { fan: User | null })[]> => {
    const subscriptions = await SubscriptionModel.findSubscriptionsByCreator(creatorId);
    if (!subscriptions || subscriptions.length === 0) return [];

    const subscriptionsWithFans = await Promise.all(subscriptions.map(async (sub) => {
        const fan = await UserModel.findUserById(sub.fan_id);
        return {
            ...sub,
            fan: fan ? reshapeUserForApp(fan) : null,
        };
    }));    
    return subscriptionsWithFans;       
};

/**
 * Cancels an active subscription for a fan.
 * @param subscriptionId - The internal ID of the subscription to cancel.
 * @param fanId - The ID of the fan requesting the cancellation.
 * @returns The updated subscription object.
 */
export const cancelFanSubscription = async (subscriptionId: string, fanId: string) => {
    const subscription = await SubscriptionModel.findSubscriptionById(subscriptionId);
    if (!subscription || subscription.fan_id !== fanId) {
        throw new AppError('Subscription not found or does not belong to the fan.', 404);
    }
    if (subscription.status !== 'active') {
        throw new AppError('Only active subscriptions can be cancelled.', 400);
    }

    try {
        const stripeSubscription = await (stripe.subscriptions as any).del(subscription.id);
        const updatedSubscription = await SubscriptionModel.updateSubscription(subscriptionId, {
            status: 'canceled',
            current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        });
        if (!updatedSubscription) {
            throw new AppError('Failed to update subscription status in database after cancellation.', 500);
        }
        return updatedSubscription;
    } catch (error: any) {
        console.error("Stripe subscription cancellation error:", error);
        throw new AppError(`Stripe Error: ${error.message}`, 500);
    }
};

/**
 * Changes the subscription tier for an active subscription.
 * @param subscriptionId - The internal ID of the subscription to update.   
 * @param newTierId - The internal ID of the new subscription tier.
 * @param fanId - The ID of the fan requesting the change.
 */
export const changeSubscriptionTier = async (subscriptionId: string, newTierId: string, fanId: string) => {
    const subscription = await SubscriptionModel.findSubscriptionById(subscriptionId);
    if (!subscription || subscription.fan_id !== fanId) {
        throw new AppError('Subscription not found or does not belong to the fan.', 404);
    }
    if (subscription.status !== 'active') {
        throw new AppError('Only active subscriptions can be changed.', 400);
    }

    const creator = await UserModel.findUserById(subscription.creator_id);
    if (!creator || !creator.creator_data?.subscriptionTiers) {
        throw new AppError('Creator or their subscription tiers not found.', 404);
    }
    
    const newTier = creator.creator_data.subscriptionTiers.find((t: any) => t.id === newTierId);
    if (!newTier || !newTier.stripePriceId) {
        throw new AppError('Selected new subscription tier is invalid or missing a Stripe Price ID.', 400);
    }

    try {
        const stripeSubscription = await stripe.subscriptions.update(subscription.id, {
            items: [{
                id: (subscription as any).stripe_item_id, // Assuming you store this
                price: newTier.stripePriceId,
            }],
            proration_behavior: 'create_prorations',
        });

        const updatedSubscription = await SubscriptionModel.updateSubscription(
            subscriptionId, 
            {
                tier_id: newTierId, 
                price: newTier.price, 
                stripe_price_id: newTier.stripePriceId,
                current_period_end: new Date((stripeSubscription as any).current_period_end * 1000).toISOString(),
            }
        );

        if (!updatedSubscription) {
            throw new AppError('Failed to update subscription tier in database after Stripe update.', 500);
        }

        return updatedSubscription;

    } catch (error: any) {
        console.error("Stripe subscription tier change error:", error);
        throw new AppError(`Stripe Error: ${error.message}`, 500);
    }       
};