import stripe from '../config/stripeClient';
import * as TransactionModel from '../models/transaction.model';
import { AppError } from '../middleware/error.middleware';
import { DEFAULT_COMMISSION_RATE } from '../../lib/constants'; // Assuming constants are in a shared lib
import { getOrCreateStripeCustomer } from '../utils/stripe.utils'; // Import our utility

/**
 * Handles the business logic for a fan sending a tip to a creator.
 * @param fanId - The ID of the fan sending the tip.
 * @param creatorId - The ID of the creator receiving the tip.
 * @param amountInCents - The tip amount in cents.
 * @returns The newly created transaction record.
 */
export const sendTipToCreator = async (fanId: string, creatorId: string, amountInCents: number,  message: string | undefined, contentId: string) => {
    if (amountInCents < 100) { // Enforce a minimum tip of $1.00
        throw new AppError('Tip amount must be at least $1.00.', 400);
    }
    // and the creator's Stripe Connected Account ID from your database.
    const fanStripeCustomerId = await getOrCreateStripeCustomer(fanId);
    // NOTE: For now, we are not transferring funds directly to the creator's
    // connected account. We will collect the funds and handle payouts later.
    // This simplifies the logic and defers the need for creator Stripe onboarding.
    console.log('[payment.service] contentId:', contentId);
    // 2. Create a PaymentIntent. This is an instruction to Stripe to collect money.
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        customer: fanStripeCustomerId,
        // We add metadata to link this Stripe transaction back to our application's data.
        // This is CRITICAL for webhooks and reconciliation.
        metadata: {
            transaction_type: 'tip',
            fan_id: fanId,
            creator_id: creatorId,
            fan_message: message || '', // Handle undefined case
            related_content_id: contentId, // <-- Add the content ID here
        },
    });

    if (!paymentIntent.client_secret) {
        throw new AppError('Failed to create Stripe Payment Intent.', 500);
    }
    
    // 3. Return the `client_secret` to the frontend. The frontend needs this
    //    to securely confirm the payment with Stripe without ever touching sensitive data.
    return { 
        clientSecret: paymentIntent.client_secret,
    };
};


/**
 * Handles incoming webhook events from Stripe. This is the single source of truth for payment success.
 * @param event - The verified Stripe event object from the webhook middleware.
 */
export const handleStripeWebhookEvent = async (event: any) => {
    // We only care about successfully completed payments.
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;

        // Check our metadata to see what kind of transaction this was.
        const transactionType = paymentIntent.metadata.transaction_type;

        if (transactionType === 'tip') {
            console.log('[Webhook] Successful tip PaymentIntent received:', paymentIntent.id);
            console.log('Full PaymentIntent object:', paymentIntent);
            // Extract the data we saved in the metadata
            const fanId = paymentIntent.metadata.fan_id;
            const creatorId = paymentIntent.metadata.creator_id;
            const amountInCents = paymentIntent.amount;
            const fanMessage = paymentIntent.metadata.fan_message; // <-- Get the message
            const contentId = paymentIntent.metadata.related_content_id; // <-- Get the content ID

            // Calculate platform fee and creator payout
            const platformFee = Math.round(amountInCents * (DEFAULT_COMMISSION_RATE / 100));
            const creatorPayout = amountInCents - platformFee;

            // --- THIS IS THE FIX ---
            // Create the transaction record in our database NOW, because we know the payment succeeded.
            await TransactionModel.createTransaction({
                fan_id: fanId,
                creator_id: creatorId,
                type: 'Tip',
                amount: amountInCents,
                platform_fee: platformFee,
                creator_payout: creatorPayout,
                status: 'Cleared', // Mark it as cleared immediately
                payment_gateway_id: paymentIntent.id, // Save the Stripe PaymentIntent ID
                related_content_id: contentId,
                message: fanMessage,
            });
            console.log(`[Webhook] Tip transaction for ${amountInCents/100} USD saved to database.`);
            // --- END OF FIX ---
        }

        // In the future, you can add more handlers here
        // else if (transactionType === 'ppv_unlock') { ... }

    } else if (event.type === 'invoice.payment_succeeded') {
        // This is where you would handle successful SUBSCRIPTION renewals
        const invoice = event.data.object;
        console.log('[Webhook] Successful subscription invoice received:', invoice.id);
        // ... logic to update subscription period and create a transaction ...
    }
    return { received: true };
};
