import stripe from '../config/stripeClient';
import * as TransactionModel from '../models/transaction.model';
import * as SubscriptionModel from '../models/subscription.model';
import { AppError } from '../middleware/error.middleware';
import { Transaction } from '@common/types/Transaction';
import { DEFAULT_COMMISSION_RATE } from '../../../podm-frontend/src/lib/constants'; // Assuming constants are in a shared lib

/**
 * Handles the business logic for a fan sending a tip to a creator.
 * @param fanId - The ID of the fan sending the tip.
 * @param creatorId - The ID of the creator receiving the tip.
 * @param amountInCents - The tip amount in cents.
 * @returns The newly created transaction record.
 */
export const sendTipToCreator = async (fanId: string, creatorId: string, amountInCents: number) => {
    // In a real application, you would fetch the fan's Stripe Customer ID
    // and the creator's Stripe Connected Account ID from your database.
    const fanStripeCustomerId = 'cus_...'; // Fetched from fan's profile
    const creatorStripeAccountId = 'acct_...'; // Fetched from creator's profile

    // Step 1: Create a transaction record in your database with a 'Pending' status.
    const platformFee = Math.round(amountInCents * (DEFAULT_COMMISSION_RATE / 100));
    const creatorPayout = amountInCents - platformFee;

    const pendingTransaction = await TransactionModel.createTransaction({
        fanId,
        creatorId,
        type: 'Tip',
        amount: amountInCents,
        platformFee,
        creatorPayout,
        status: 'Pending',
    });

    if (!pendingTransaction) {
        throw new AppError('Failed to initiate transaction.', 500);
    }

    // Step 2: Create a Stripe PaymentIntent to charge the fan.
    // We include the creator's connected account ID in the transfer_data
    // to direct the funds to them after taking our platform fee.
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            customer: fanStripeCustomerId,
            application_fee_amount: platformFee,
            transfer_data: {
                destination: creatorStripeAccountId,
            },
            metadata: {
                transactionId: pendingTransaction._id, // Link the Stripe payment to our internal transaction
                type: 'tip',
            },
        });

        // Step 3: Return the client secret to the frontend to confirm the payment.
        return { 
            clientSecret: paymentIntent.client_secret,
            transactionId: pendingTransaction._id 
        };
    } catch (error: any) {
        // If Stripe fails, update our transaction to 'Failed'.
        await TransactionModel.updateTransactionStatus(pendingTransaction.paymentGatewayId, 'Failed');
        throw new AppError(`Stripe Error: ${error.message}`, 500);
    }
};

/**
 * Handles incoming webhook events from Stripe.
 * @param event - The verified Stripe event object.
 */
export const handleStripeWebhookEvent = async (event: any) => {
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            const transactionId = paymentIntent.metadata.transactionId;

            // Update our internal transaction record to 'Cleared'
            await TransactionModel.updateTransactionStatus(transactionId, 'Cleared');
            
            // If it's a subscription payment, create the subscription record
            if (paymentIntent.metadata.type === 'subscription') {
                // await SubscriptionModel.createSubscription(...);
            }
            
            console.log(`Payment successful for transaction: ${transactionId}`);
            break;
        
        case 'payment_intent.payment_failed':
            const failedPaymentIntent = event.data.object;
            const failedTransactionId = failedPaymentIntent.metadata.transactionId;
            
            // Update our internal transaction record to 'Failed'
            await TransactionModel.updateTransactionStatus(failedTransactionId, 'Failed');
            
            console.log(`Payment failed for transaction: ${failedTransactionId}`);
            break;

        // ... handle other events like 'customer.subscription.created', etc.

        default:
            console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
};
