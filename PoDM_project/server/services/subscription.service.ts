import stripe from '../config/stripeClient';
import * as SubscriptionModel from '../models/subscription.model';
import * as UserModel from '../models/user.model';
import { AppError } from '../middleware/error.middleware';
import { Subscription } from '@common/types/Subscription';
import { User } from '@common/types/User';
import { reshapeUserForApp } from '../utils/user.utils';
import { reshapeSubscriptionForApp } from '../utils/subscription.utils';
import { getOrCreateStripeCustomer } from '../utils/stripe.utils';
import { SubscriptionTier } from '@common/types/Creator';
import * as TransactionModel from '../models/transaction.model';
import { DEFAULT_COMMISSION_RATE } from '../../lib/constants';
import supabase from '../config/supabaseClient';
import * as MessageService from './message.service'; // 1. IMPORT THE MESSAGE SERVICE
import * as ContentModel from '../models/content.model'; // 2. IMPORT THE CONTENT MODEL

/**
 * Creates a new subscription for an authenticated fan. This is the primary service
 * for all subscription creations, used by both new signups and existing users.
 * @param fan_id - The ID of the fan who is subscribing.
 * @param creator_id - The ID of the creator being subscribed to.
 * @param tier_id - The internal ID of the subscription tier.
 * @param paymentMethodId - The Stripe Payment Method ID from the frontend.
 * @returns An object with the new subscription and a client secret if 3D Secure is needed.
 */
export const createSubscriptionForUser = async (
    fan_id: string,
    creator_id: string,
    tier_id: string,
    paymentMethodId: string
) => {
    console.log(`[SubService] Starting subscription creation for fan ${fan_id} to creator ${creator_id}`);

    // 1. Fetch creator and validate the selected tier
    const creator = await UserModel.findUserById(creator_id);
    if (!creator || !creator.creator_data?.subscriptionTiers) {
        throw new AppError('Creator or their subscription tiers not found.', 404);
    }

    const tier = creator.creator_data.subscriptionTiers.find((t: SubscriptionTier) => t.id === tier_id);
    if (!tier || !tier.stripePriceId) {
        throw new AppError('Selected subscription tier is invalid or missing a Stripe Price ID.', 400);
    }

    // 2. Get or create the Stripe Customer ID for the fan
    const fanStripeCustomerId = await getOrCreateStripeCustomer(fan_id);
    console.log(`[SubService] Confirmed Stripe Customer ID: ${fanStripeCustomerId}`);

    try {
        let stripeSubscription: any;

        if (tier.stripePriceId === 'price_fake_1') {
            console.log('[SubService] Using MOCK Stripe subscription for testing.');
            const now = Math.floor(Date.now() / 1000);
            stripeSubscription = {
                id: 'sub_mock_' + Date.now(),
                status: 'active',
                latest_invoice: {
                    id: 'in_mock_' + Date.now(),
                    amount_paid: tier.price,
                    status: 'paid',
                    period_start: now,
                    period_end: now + 30 * 24 * 60 * 60,
                    payment_intent: {
                        id: 'pi_mock_' + Date.now(),
                        status: 'succeeded',
                        client_secret: 'secret_mock'
                    }
                }
            };
        } else {
            // 3. Attach payment method and set it as default for future invoices
            await stripe.paymentMethods.attach(paymentMethodId, { customer: fanStripeCustomerId });
            await stripe.customers.update(fanStripeCustomerId, {
                invoice_settings: { default_payment_method: paymentMethodId },
            });

            // 4. Create the subscription in Stripe
            stripeSubscription = await stripe.subscriptions.create({
                customer: fanStripeCustomerId,
                items: [{ price: tier.stripePriceId }],
                expand: ['latest_invoice.payment_intent'],
                metadata: {
                    pod_fan_id: fan_id,
                    pod_creator_id: creator_id,
                    pod_tier_id: tier_id
                }
            });
        }

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
            fan_id: fan_id,
            creator_id: creator_id,
            tier_id: tier_id,
            status: 'active',
            start_date: new Date(periodStart * 1000).toISOString(),
            end_date: null,
            next_billing_date: new Date(periodEnd * 1000).toISOString(),
        });

        // --- 3. ADD THE WELCOME MESSAGE LOGIC HERE ---
        try {
            const welcomeConfig = creator.creator_data.welcomeMessage;
            if (welcomeConfig && welcomeConfig.isActive && welcomeConfig.message) {
                let contentPayload = undefined;
                // If there's content to attach, fetch its details
                if (welcomeConfig.freeContentId) {
                    const content = await ContentModel.findContentById(welcomeConfig.freeContentId);
                    if (content && content.files && content.files.length > 0) {
                        contentPayload = {
                            contentId: content.id,
                            type: content.type,
                            thumbnailUrl: content.files[0].thumbnailUrl,
                            isPaid: false, // Welcome content is always free
                            price: 0,
                            isUnlocked: true,
                        };
                    }
                }
                // Send the message from the creator to the new fan
                await MessageService.sendDirectMessage(creator_id, fan_id, {
                    text: welcomeConfig.message,
                    content: contentPayload,
                });
                console.log(`[SubService] Successfully sent welcome message from ${creator_id} to ${fan_id}.`);
            }
        } catch (welcomeError) {
            // IMPORTANT: Do not throw an error. A failed welcome message should not
            // cause the entire subscription process to fail for the user. Just log it.
            console.error(`[SubService] CRITICAL: Failed to send welcome message for new subscription ${dbSubscription?.id}. Error:`, welcomeError);
        }
        // --- END OF WELCOME MESSAGE LOGIC ---

        // 7. If the initial invoice was paid, create the transaction record immediately.
        if (latestInvoice && latestInvoice.status === 'paid') {
            const amountInCents = latestInvoice.amount_paid;
            const platformFee = Math.round(amountInCents * (DEFAULT_COMMISSION_RATE / 100));
            const creatorPayout = amountInCents - platformFee;

            await TransactionModel.createTransaction({
                fan_id: fan_id,
                creator_id: creator_id,
                type: 'Subscription',
                amount: amountInCents,
                platform_fee: platformFee,
                creator_payout: creatorPayout,
                status: 'Cleared',
                payment_gateway_id: typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id,
            });
            console.log(`[SubService] Initial subscription transaction for ${amountInCents / 100} USD saved to database.`);
        }

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
 * @param fan_id - The UUID of the fan.
 * @returns An array of the fan's subscriptions, each including the creator's profile and available tiers.
 */
export const getFanSubscriptions = async (fan_id: string) => {
    const subscriptions = await SubscriptionModel.findSubscriptionsByFanId(fan_id);
    if (!subscriptions) {
        return [];
    }
    const shapedSubscriptions = await Promise.all(
        subscriptions.map(sub => reshapeSubscriptionForApp(sub))
    );
    return shapedSubscriptions.filter(sub => sub !== null);
};

/**
 * Retrieves all active subscribers for a given creator.
 * @param creator_id - The UUID of the creator.
 * @returns An array of the creator's active subscriptions with fan details.
 */
export const getCreatorSubscribers = async (creator_id: string): Promise<(Subscription & { fan: User | null })[]> => {
    const subscriptions = await SubscriptionModel.findSubscriptionsByCreator(creator_id);
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
 * @param fan_id - The ID of the fan requesting the cancellation.
 * @returns The updated subscription object.
 */
export const cancelFanSubscription = async (subscriptionId: string, fan_id: string) => {
    const numericSubscriptionId = parseInt(subscriptionId, 10);
    if (isNaN(numericSubscriptionId)) {
        throw new AppError('Invalid subscription ID format.', 400);
    }

    const subscription = await SubscriptionModel.findSubscriptionById(numericSubscriptionId); if (!subscription || subscription.fan_id !== fan_id) {
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
 * @param fan_id - The ID of the fan requesting the change.
 * @param newTierId - The internal ID of the new subscription tier.
 */
export const changeSubscriptionTier = async (subscriptionId: string, fan_id: string, newTierId: string) => {
    const numericSubscriptionId = parseInt(subscriptionId, 10);
    if (isNaN(numericSubscriptionId)) {
        throw new AppError('Invalid subscription ID format.', 400);
    }

    const subscription = await SubscriptionModel.findSubscriptionById(numericSubscriptionId);

    if (!subscription || subscription.fan_id !== fan_id) {
        throw new AppError('Subscription not found or you are not authorized to change it.', 404);
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
        throw new AppError('The selected new tier is invalid.', 400);
    }

    if (!subscription.stripe_subscription_id) {
        throw new AppError('Stripe subscription ID not found for this subscription.', 500);
    }

    try {
        const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
        const currentItemId = stripeSub.items.data[0]?.id;
        if (!currentItemId) {
            throw new AppError('Could not find the item to update in the Stripe subscription.', 500);
        }

        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            items: [{
                id: currentItemId,
                price: newTier.stripePriceId,
            }],
            proration_behavior: 'create_prorations',
        });

        // --- THIS IS THE FIX ---
        // We ONLY update the tier_id. We do NOT update the price, as that column doesn't exist.
        const updatedDbSubscription = await SubscriptionModel.updateSubscription(
            numericSubscriptionId.toString(),
            {
                tier_id: newTierId,
            }
        );
        // --- END OF FIX ---

        if (!updatedDbSubscription) {
            throw new AppError('Failed to update subscription in our database after Stripe update.', 500);
        }

        // The reshape utility will now correctly look up the new tier's name and price.
        return reshapeSubscriptionForApp(updatedDbSubscription);

    } catch (error: any) {
        console.error("Stripe subscription tier change error:", error);
        throw new AppError(`Stripe Error: ${error.message}`, 500);
    }
};