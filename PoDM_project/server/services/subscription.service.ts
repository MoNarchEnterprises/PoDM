import stripe from '../config/stripeClient';
import * as SubscriptionModel from '../models/subscription.model';
import * as UserModel from '../models/user.model';
import { AppError } from '../middleware/error.middleware';
import { Subscription } from '@common/types/Subscription';
import Stripe from 'stripe';

/**
 * Handles the business logic for creating a new subscription for a fan.
 * @param fanId - The ID of the fan subscribing.
 * @param creatorId - The ID of the creator being subscribed to.
 * @param tierId - The ID of the subscription tier (which corresponds to a Stripe Price ID).
 * @param paymentMethodId - The Stripe Payment Method ID from the frontend.
 * @returns The newly created subscription record from the database.
 */
export const createFanSubscription = async (fanId: string, creatorId: string, tierId: string, paymentMethodId: string) => {
    // In a real app, you would fetch the fan's Stripe Customer ID or create one if it doesn't exist.
    const fanStripeCustomerId = 'cus_...'; // e.g., await getOrCreateStripeCustomer(fanId);

    try {
        // Step 1: Attach the payment method to the customer in Stripe.
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: fanStripeCustomerId,
        });

        // Step 2: Set the new payment method as the default for the customer's invoices.
        await stripe.customers.update(fanStripeCustomerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        // Step 3: Create the subscription in Stripe.
        const stripeSubscription: Stripe.Subscription = await stripe.subscriptions.create({
            customer: fanStripeCustomerId,
            items: [{ price: tierId }], // The tierId should be the Stripe Price ID
            expand: ['latest_invoice.payment_intent'],
        });

        if (!stripeSubscription || !stripeSubscription.items.data[0]) {
            throw new AppError('Could not create Stripe subscription or subscription item is missing.', 500);
        }

        const firstItem = stripeSubscription.items.data[0];

        // Step 4: Create the subscription record in your local database.
        const subscriptionData: Partial<Subscription> = {
            _id: stripeSubscription.id,
            fanId,
            creatorId,
            tierId,
            status: 'active',
            startDate: new Date(firstItem.current_period_start * 1000).toISOString(),
            nextBillingDate: new Date(firstItem.current_period_end * 1000).toISOString(),
            // ... other relevant fields
        };
        
        const newSubscription = await SubscriptionModel.createSubscription(subscriptionData);

        if (!newSubscription) {
            // If this fails, you have a Stripe subscription without a local record.
            // This requires a robust error handling/reconciliation process.
            await stripe.subscriptions.cancel(stripeSubscription.id);
            throw new AppError('Failed to save subscription to database after payment.', 500);
        }

        return newSubscription;

    } catch (error: any) {
        throw new AppError(`Stripe Error: ${error.message}`, 500);
    }
};

/**
 * Handles the business logic for canceling a fan's subscription.
 * @param subscriptionId - The ID of the subscription to cancel (should be the Stripe Subscription ID).
 * @param fanId - The ID of the fan making the request, for verification.
 * @returns The updated subscription record from the database.
 */
export const cancelFanSubscription = async (subscriptionId: string, fanId: string) => {
    const subscription = await SubscriptionModel.findSubscriptionById(subscriptionId);

    if (!subscription || subscription.fanId !== fanId) {
        throw new AppError('Subscription not found or you are not authorized to cancel it.', 404);
    }

    try {
        // Cancel the subscription in Stripe at the end of the current billing period.
        const canceledStripeSubscription: Stripe.Subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });

        // Update the subscription in your local database.
        const updatedSubscription = await SubscriptionModel.updateSubscription(subscriptionId, {
            status: 'canceled',
            endDate: new Date(canceledStripeSubscription.cancel_at! * 1000).toISOString(),
        });

        return updatedSubscription;
    } catch (error: any) {
        throw new AppError(`Stripe Error: ${error.message}`, 500);
    }
};
