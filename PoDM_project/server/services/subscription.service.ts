import stripe from '../config/stripeClient';
import * as SubscriptionModel from '../models/subscription.model';
import * as UserModel from '../models/user.model';
import { AppError } from '../middleware/error.middleware';
import { Subscription } from '@common/types/Subscription';
import { reshapeUserForApp } from '../utils/user.utils';
import { User } from '@common/types/User';

/**
 * Finds or creates a Stripe Customer ID for a given fan.
 * @param fanId The fan's UUID from our database.
 * @returns The Stripe Customer ID (cus_...).
 */
const getOrCreateStripeCustomer = async (fanId: string) => {
    const user = await UserModel.findUserById(fanId);
    if (!user) throw new AppError('Fan not found.', 404);

    if (user.stripe_customer_id) {
        console.log(`[Stripe] Found existing customer ID for user ${fanId}: ${user.stripe_customer_id}`);
        return user.stripe_customer_id;
    }

    console.log(`[Stripe] No customer ID found for user ${fanId}. Creating new customer...`);
    const customer = await stripe.customers.create({
        email: user.email,
        name: user.profile.name,
        metadata: { pod_user_id: user._id },
    });

    await UserModel.updateProfile(fanId, { stripe_customer_id: customer.id });
    console.log(`[Stripe] New customer created and saved: ${customer.id}`);
    
    return customer.id;
};


/**
 * Handles the business logic for creating a new subscription for a fan.
 * @param fanId - The ID of the fan subscribing.
 * @param creatorId - The ID of the creator being subscribed to.
 * @param tierId - The internal ID of the subscription tier ('t1', 't2', etc.).
 * @param paymentMethodId - The Stripe Payment Method ID from the frontend.
 * @returns An object with the new subscription and a client secret if needed.
 */
export const createFanSubscription = async (fanId: string, creatorId: string, tierId: string, paymentMethodId: string) => {
    const creator = await UserModel.findUserById(creatorId);
    if (!creator || !creator.creator_data?.subscriptionTiers) {
        throw new AppError('Creator or their subscription tiers not found.', 404);
    }
    
    const tier = creator.creator_data.subscriptionTiers.find(t => t.id === tierId);
    if (!tier || !tier.stripePriceId) {
        throw new AppError('Selected subscription tier is invalid or missing a Stripe Price ID.', 400);
    }

    const fanStripeCustomerId = await getOrCreateStripeCustomer(fanId);

    try {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: fanStripeCustomerId });
        await stripe.customers.update(fanStripeCustomerId, {
            invoice_settings: { default_payment_method: paymentMethodId },
        });

        const stripeSubscription = await stripe.subscriptions.create({
            customer: fanStripeCustomerId,
            items: [{ price: tier.stripePriceId }],
            expand: ['latest_invoice.payment_intent'],
            metadata: {
                pod_fan_id: fanId,
                pod_creator_id: creatorId,
                pod_tier_id: tierId,
            }
        });

        // The subscription might require authentication (like 3D Secure)
        const latestInvoice = stripeSubscription.latest_invoice as any;
        const paymentIntent = latestInvoice?.payment_intent as any;

        if (paymentIntent?.status === 'requires_action') {
            return {
                requiresAction: true,
                clientSecret: paymentIntent.client_secret,
                subscriptionId: stripeSubscription.id,
            };
        }

        // If payment is successful immediately, save to our DB
        const dbSubscription = await SubscriptionModel.createSubscription({
            id: stripeSubscription.id,
            fan_id: fanId,
            creator_id: creatorId,
            tier_id: tierId,
            status: 'active',
            price: tier.price,
            stripe_price_id: tier.stripePriceId,
            current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        });

        if (!dbSubscription) {
            await stripe.subscriptions.cancel(stripeSubscription.id);
            throw new AppError('Failed to save subscription to database after successful payment.', 500);
        }

        return {
            requiresAction: false,
            subscription: dbSubscription,
        };

    } catch (error: any) {
        console.error("Stripe subscription creation error:", error);
        throw new AppError(`Stripe Error: ${error.message}`, 500);
    }
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
        const stripeSubscription = await stripe.subscriptions.del(subscription.id);
        const updatedSubscription = await SubscriptionModel.updateSubscriptionStatus(subscriptionId, 'cancelled', new Date(stripeSubscription.current_period_end * 1000).toISOString());
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
 * Retrieves all subscriptions for a given fan and enriches them with creator data.
 * @param fanId - The UUID of the fan.
 * @returns An array of the fan's subscriptions, each including the creator's profile and available tiers.
 */
export const getFanSubscriptions = async (fanId: string) => {
    // 1. Fetch all subscriptions for the fan from our database
    const subscriptions = await SubscriptionModel.findSubscriptionsByFanId(fanId);
    if (!subscriptions) {
        // Return empty array if there's an error or no subscriptions found
        return [];
    }

    // 2. Use Promise.all to fetch the creator's full profile for each subscription concurrently
    const subscriptionsWithCreators = await Promise.all(
        subscriptions.map(async (sub) => {
            const creator = await UserModel.findUserById(sub.creator_id);
            if (!creator) {
                // If a creator was deleted or something went wrong, we can skip this subscription
                return null;
            }
            
            const reshapedCreator = reshapeUserForApp(creator);

            return {
                ...sub,
                _id: sub.id, // Ensure frontend gets _id
                // Nest the full, reshaped creator object
                creator: reshapedCreator,
                // Include the creator's available tiers for the "Change Tier" modal
                availableTiers: reshapedCreator.creatorData?.subscriptionTiers || [],
            };
        })
    );
    
    // 3. Filter out any null results and return the final, enriched data
    return subscriptionsWithCreators.filter(sub => sub !== null);
};

/**
 * Retrieves all active subscribers for a given creator.
 * @param creatorId - The UUID of the creator.
 * @returns An array of the creator's active subscriptions with fan details.
 */
export const getCreatorSubscribers = async (creatorId: string): Promise<(Subscription & { fan: User | null })[]> => {
    const subscriptions = await SubscriptionModel.findSubscriptionsByCreatorId(creatorId);
    if (!subscriptions || subscriptions.length === 0) {
        return [];
    }

    // For each subscription, fetch and reshape the fan's user data
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
    if (subscription.tier_id === newTierId) {
        throw new AppError('New tier must be different from the current tier.', 400);
    }

    const creator = await UserModel.findUserById(subscription.creator_id);
    if (!creator || !creator.creator_data?.subscriptionTiers) {
        throw new AppError('Creator or their subscription tiers not found.', 404);
    }
    
    const newTier = creator.creator_data.subscriptionTiers.find(t => t.id === newTierId);
    if (!newTier || !newTier.stripePriceId) {
        throw new AppError('Selected new subscription tier is invalid or missing a Stripe Price ID.', 400);
    }

    try {
        const stripeSubscription = await stripe.subscriptions.update(subscription.id, {
            items: [{
                id: subscription.id, // Subscription item ID
                price: newTier.stripePriceId,
            }],
            proration_behavior: 'create_prorations',
        });

        const updatedSubscription = await SubscriptionModel.updateSubscriptionTier(
            subscriptionId, 
            newTierId, 
            newTier.price, 
            newTier.stripePriceId,
            new Date(stripeSubscription.current_period_end * 1000).toISOString()
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