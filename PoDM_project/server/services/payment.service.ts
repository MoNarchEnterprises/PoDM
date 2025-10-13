import stripe from '../config/stripeClient';
import * as TransactionModel from '../models/transaction.model';
import * as MessageModel from '../models/message.model'; // <-- ADD THIS IMPORT
import { AppError } from '../middleware/error.middleware';
import { DEFAULT_COMMISSION_RATE } from '../../lib/constants'; // Assuming constants are in a shared lib
import { getOrCreateStripeCustomer } from '../utils/stripe.utils'; // Import our utility
import Stripe from 'stripe';
import { io } from '../config/socket';
import { generateSignedUrlsForContent } from '../utils/content.utils';

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
 * Creates a Stripe Payment Intent for unlocking paid content in a message.
 * @param fanId - The ID of the fan unlocking the content.
 * @param messageId - The ID of the message containing the locked content.
 * @returns An object containing the clientSecret for the Payment Intent.
 */
export const createMessageUnlockIntent = async (fanId: string, messageId: string) => {
    // 1. Validation
    const message = await MessageModel.findMessageById(messageId);
    if (!message) throw new AppError('Message not found.', 404);
    if (message.receiver_id !== fanId) throw new AppError('Not authorized.', 403);
    if (!message.content || !message.content.isPaid) throw new AppError('Not paid content.', 400);
    if (message.content.isUnlocked) throw new AppError('Already unlocked.', 400);

    const amountInCents = message.content.price;

    // 2. Get Stripe customer ID
    const fanStripeCustomerId = await getOrCreateStripeCustomer(fanId);

    

    const customer = await stripe.customers.retrieve(fanStripeCustomerId, {
        expand: ['invoice_settings.default_payment_method'],
    }) as Stripe.Customer;
    
    const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

    if (!defaultPaymentMethod) {
        throw new AppError('No default payment method found. Please add one in your settings.', 400);
    }
    
    // 3. Create and immediately try to confirm the PaymentIntent on the server
    const metadataPayload = {
        transaction_type: 'ppv_message',
        fan_id: fanId,
        creator_id: message.sender_id,
        message_id: messageId,
        content_id: message.content.contentId,
    };
    console.log('[PaymentService] Creating and confirming PaymentIntent with metadata:', metadataPayload);

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            customer: fanStripeCustomerId,
            payment_method: typeof defaultPaymentMethod === 'string' ? defaultPaymentMethod : defaultPaymentMethod.id,
            off_session: true, // Crucial for charging a saved card without the user present
            confirm: true,     // Tells Stripe to attempt the charge immediately
            metadata: metadataPayload,
        });

        // 4. Return the result to the client
        return { 
            clientSecret: paymentIntent.client_secret,
            status: paymentIntent.status 
        };
    } catch (err: any) {
        // Handle specific card errors, like insufficient funds or if authentication is required
        if (err.code === 'authentication_required') {
            // The card requires 3D Secure. We need to send the client_secret back to the frontend to handle it.
            return {
                clientSecret: err.raw.payment_intent.client_secret,
                status: 'requires_action'
            };
        }
        // For other errors (e.g., card declined), throw a generic error
        console.error("Stripe Payment Intent creation/confirmation failed:", err.message);
        throw new AppError(`Payment failed: ${err.message}`, 400);
    }
};

/**
 * Handles incoming webhook events from Stripe. This is the single source of truth for payment success.
 * @param event - The verified Stripe event object from the webhook middleware.
 */
export const handleStripeWebhookEvent = async (event: any) => {
    // We only care about successfully completed payments.
    console.log(`[Webhook] Received event: ${event.type}`);
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;

        // Check our metadata to see what kind of transaction this was.
        const transactionType = paymentIntent.metadata.transaction_type;
        console.log(`[Webhook] Handling payment_intent.succeeded for type: ${transactionType}`);

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

        else if (transactionType === 'ppv_message') {
            console.log('[Webhook] Successful PPV Message PaymentIntent received:', paymentIntent.id);
            const { fan_id, creator_id, message_id, content_id } = paymentIntent.metadata;
            const amountInCents = paymentIntent.amount;

            const platformFee = Math.round(amountInCents * (DEFAULT_COMMISSION_RATE / 100));
            const creatorPayout = amountInCents - platformFee;

            // Create the financial transaction record
            await TransactionModel.createTransaction({
                fan_id,
                creator_id,
                type: 'PPV Message',
                amount: amountInCents,
                platform_fee: platformFee,
                creator_payout: creatorPayout,
                status: 'Cleared',
                payment_gateway_id: paymentIntent.id,
                related_content_id: content_id,
                related_message_id: message_id, // Link to the message
            });

            console.log('[Webhook] PPV Unlock message id:', message_id);
            const updatedMessage = await MessageModel.unlockContentInMessage(message_id);

            // --- 2. BROADCAST THE UPDATE ---
            if (updatedMessage) {
                const messageWithSignedUrl = await generateSignedUrlsForContent(updatedMessage);
                const roomName = `conversation:${updatedMessage.conversation_id}`;
                // Reshape the data to the camelCase format the frontend expects
                const messageForFrontend = {
                    _id: messageWithSignedUrl.id.toString(),
                    conversationId: updatedMessage.conversation_id,
                    senderId: updatedMessage.sender_id,
                    receiverId: updatedMessage.receiver_id,
                    text: updatedMessage.text,
                    content: updatedMessage.content, // This now has isUnlocked: true
                    isRead: updatedMessage.is_read,
                    createdAt: updatedMessage.created_at,
                };
                io.to(roomName).emit('message_updated', messageForFrontend);
                console.log(`[Webhook] Broadcasted message update to room: ${roomName}`);
            }
            // --- END OF BROADCAST LOGIC ---

            console.log(`[Webhook] PPV Message transaction for ${amountInCents/100} USD saved and content unlocked.`);
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
