import stripe from '../config/stripeClient';
import * as TransactionModel from '../models/transaction.model';
import * as MessageModel from '../models/message.model';
import * as SubscriptionModel from '../models/subscription.model';
import { AppError } from '../middleware/error.middleware';
import { DEFAULT_COMMISSION_RATE } from '../../lib/constants';
import { getOrCreateStripeCustomer } from '../utils/stripe.utils';
import Stripe from 'stripe';
import { io } from '../config/socket';
import { generateSignedUrlsForContent } from '../utils/content.utils';
import supabase from '../config/supabaseClient';
import * as ContentModel from '../models/content.model';

/**
 * Handles the business logic for a fan sending a tip to a creator.
 * @param fanId - The ID of the fan sending the tip.
 * @param creatorId - The ID of the creator receiving the tip.
 * @param amountInCents - The tip amount in cents.
 * @returns The newly created transaction record.
 */
export const sendTipToCreator = async (fanId: string, creatorId: string, amountInCents: number,  message: string | undefined, contentId: string, paymentMethodId?: string) => {
    if (amountInCents < 100) { // Minimum $1 tip
        throw new AppError('Tip amount must be at least $1.00.', 400);
    }

    const fanStripeCustomerId = await getOrCreateStripeCustomer(fanId);
    
    const metadata = {
        transaction_type: 'tip',
        fan_id: fanId,
        creator_id: creatorId,
        fan_message: message || '',
        related_content_id: contentId,
    };

    try {
        const paymentIntentConfig: Stripe.PaymentIntentCreateParams = {
            amount: amountInCents,
            currency: 'usd',
            customer: fanStripeCustomerId,
            metadata: metadata,
        };

        if (paymentMethodId) {
            paymentIntentConfig.payment_method = paymentMethodId;
            paymentIntentConfig.confirm = true; // Confirm immediately if payment method is provided
            paymentIntentConfig.off_session = true; // Mark as off-session if using saved card
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig);

        return {
            clientSecret: paymentIntent.client_secret,
            status: paymentIntent.status
        };
    } catch (err: any) {
        console.error("Stripe Payment Intent creation failed:", err.message);
        throw new AppError(`Failed to create payment intent: ${err.message}`, 500);
    }
};

/**
 * Creates a Stripe Payment Intent for unlocking paid content in a message.
 * @param fanId - The ID of the fan unlocking the content.
 * @param messageId - The ID of the message containing the locked content.
 * @returns An object containing the clientSecret for the Payment Intent.
 */
export const createMessageUnlockIntent = async (fanId: string, messageId: string) => {
    const message = await MessageModel.findMessageById(messageId);
    if (!message) throw new AppError('Message not found.', 404);
    if (message.receiver_id !== fanId) throw new AppError('Not authorized.', 403);
    if (!message.content || !message.content.isPaid) throw new AppError('Not paid content.', 400);
    if (message.content.isUnlocked) throw new AppError('Already unlocked.', 400);

    const amountInCents = message.content.price;
    const fanStripeCustomerId = await getOrCreateStripeCustomer(fanId);

    const customer = await stripe.customers.retrieve(fanStripeCustomerId, {
        expand: ['invoice_settings.default_payment_method'],
    }) as Stripe.Customer;
    
    const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

    if (!defaultPaymentMethod) {
        throw new AppError('No default payment method found. Please add one in your settings.', 400);
    }
    
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
            off_session: true, 
            confirm: true,     
            metadata: metadataPayload,
        });

        return { 
            clientSecret: paymentIntent.client_secret,
            status: paymentIntent.status 
        };
    } catch (err: any) {
        if (err.code === 'authentication_required') {
            return {
                clientSecret: err.raw.payment_intent.client_secret,
                status: 'requires_action'
            };
        }
        console.error("Stripe Payment Intent creation/confirmation failed:", err.message);
        throw new AppError(`Payment failed: ${err.message}`, 400);
    }
};

/**
 * Creates a Stripe Payment Intent for unlocking a paid post.
 * @param fanId - The ID of the fan unlocking the content.
 * @param contentId - The ID of the content to unlock.
 * @returns An object containing the clientSecret for the Payment Intent.
 */
export const createPostUnlockIntent = async (fanId: string, contentId: string) => {
    const content = await ContentModel.findContentById(contentId);
    if (!content || content.visibility !== 'pay_per_view' || !content.price) {
        throw new AppError('This content is not available for purchase.', 400);
    }

    const amountInCents = content.price;
    const fanStripeCustomerId = await getOrCreateStripeCustomer(fanId);

    const customer = await stripe.customers.retrieve(fanStripeCustomerId, {
        expand: ['invoice_settings.default_payment_method'],
    }) as Stripe.Customer;
    
    const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

    if (!defaultPaymentMethod) {
        throw new AppError('No default payment method found. Please add one in your settings.', 400);
    }
    
    const metadataPayload = {
        transaction_type: 'ppv_post',
        fan_id: fanId,
        creator_id: content.creator_id,
        content_id: contentId,
    };

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            customer: fanStripeCustomerId,
            payment_method: typeof defaultPaymentMethod === 'string' ? defaultPaymentMethod : defaultPaymentMethod.id,
            off_session: true, 
            confirm: true,     
            metadata: metadataPayload,
        });

        return { 
            clientSecret: paymentIntent.client_secret,
            status: paymentIntent.status 
        };
    } catch (err: any) {
        if (err.code === 'authentication_required') {
            return {
                clientSecret: err.raw.payment_intent.client_secret,
                status: 'requires_action'
            };
        }
        console.error("Stripe Payment Intent creation/confirmation failed:", err.message);
        throw new AppError(`Payment failed: ${err.message}`, 400);
    }
};

/**
 * Handles incoming webhook events from Stripe. This is the single source of truth for payment success.
 * @param event - The verified Stripe event object from the webhook middleware.
 */
export const handleStripeWebhookEvent = async (event: Stripe.Event) => {
    console.log(`[Webhook] Received event: ${event.type}`);

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const transactionType = paymentIntent.metadata.transaction_type;
        console.log(`[Webhook] Handling payment_intent.succeeded for type: ${transactionType}`);

        // Common transaction data
        const { fan_id, creator_id, content_id } = paymentIntent.metadata;
        const amountInCents = paymentIntent.amount;
        const platformFee = Math.round(amountInCents * (DEFAULT_COMMISSION_RATE / 100));
        const creatorPayout = amountInCents - platformFee;

        if (transactionType === 'tip') {
            console.log('[Webhook] Successful tip PaymentIntent received:', paymentIntent.id);
            const { fan_id, creator_id, fan_message, related_content_id } = paymentIntent.metadata;
            const amountInCents = paymentIntent.amount;
            const platformFee = Math.round(amountInCents * (DEFAULT_COMMISSION_RATE / 100));
            const creatorPayout = amountInCents - platformFee;

            await TransactionModel.createTransaction({
                fan_id: fan_id,
                creator_id: creator_id,
                type: 'Tip',
                amount: amountInCents,
                platform_fee: platformFee,
                creator_payout: creatorPayout,
                status: 'Cleared',
                payment_gateway_id: paymentIntent.id,
                related_content_id: related_content_id,
                message: fan_message,
            });

            // Increment the tip count on the content table
            if (related_content_id) {
                const { error: rpcError } = await supabase.rpc('increment_tip_count', { content_id_to_update: related_content_id, tip_amount: amountInCents });
                if (rpcError) {
                    console.error('Error incrementing tip count:', rpcError);
                    // Don't throw an error here, as the main action has been completed
                }
            }

            console.log(`[Webhook] Tip transaction for ${amountInCents/100} USD saved to database.`);
        } else if (transactionType === 'ppv_message') {
            console.log('[Webhook] Successful PPV Message PaymentIntent received:', paymentIntent.id);
            const { fan_id, creator_id, message_id, content_id } = paymentIntent.metadata;
            const amountInCents = paymentIntent.amount;
            const platformFee = Math.round(amountInCents * (DEFAULT_COMMISSION_RATE / 100));
            const creatorPayout = amountInCents - platformFee;

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
                message: message_id,
            });

            const updatedMessage = await MessageModel.unlockContentInMessage(message_id);

            if (updatedMessage) {
                const messageWithSignedUrl = await generateSignedUrlsForContent(updatedMessage);
                const roomName = `conversation:${updatedMessage.conversation_id}`;
                const messageForFrontend = {
                    _id: messageWithSignedUrl.id.toString(),
                    conversationId: updatedMessage.conversation_id,
                    senderId: updatedMessage.sender_id,
                    receiverId: updatedMessage.receiver_id,
                    text: updatedMessage.text,
                    content: updatedMessage.content,
                    isRead: updatedMessage.is_read,
                    createdAt: updatedMessage.created_at,
                };
                io.to(roomName).emit('message_updated', messageForFrontend);
                console.log(`[Webhook] Broadcasted message update to room: ${roomName}`);
            }
            console.log(`[Webhook] PPV Message transaction for ${amountInCents/100} USD saved and content unlocked.`);
        }
        else if (transactionType === 'ppv_post') {
            console.log('[Webhook] Successful PPV Post PaymentIntent received:', paymentIntent.id);
            
            await TransactionModel.createTransaction({
                fan_id,
                creator_id,
                type: 'PPV Post',
                amount: amountInCents,
                platform_fee: platformFee,
                creator_payout: creatorPayout,
                status: 'Cleared',
                payment_gateway_id: paymentIntent.id,
                related_content_id: content_id,
            });

            console.log(`[Webhook] PPV Post transaction for ${amountInCents/100} USD saved to database.`);
        }

    } else if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Get subscription ID from invoice lines
        const subscriptionLineItem = invoice.lines.data.find(line => typeof line.subscription === 'string' && line?.subscription.length > 0);
        console.log('[Webhook] Handling invoice.payment_succeeded for invoice:', invoice.id);
        console.log('[Webhook] Subscription line item:', subscriptionLineItem);

        if (!subscriptionLineItem || !subscriptionLineItem.subscription) {
            console.error('[Webhook] Invoice paid, but no subscription line item found. Skipping transaction creation.');
            return;
        }
        
        // Get the subscription ID (it's a string in the line item)
        const stripeSubscriptionId =  subscriptionLineItem.subscription as string;
            
        console.log('[Webhook] Subscription ID from invoice:', stripeSubscriptionId);
        // Retrieve the full subscription to get metadata
        const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const { pod_fan_id, pod_creator_id } = stripeSubscription.metadata;
        const amountInCents = invoice.amount_paid;

        if (!pod_fan_id || !pod_creator_id) {
            console.error(`[Webhook] Subscription ${stripeSubscriptionId} invoice paid, but missing metadata. Cannot create transaction.`);
            return;
        }
        
        const platformFee = Math.round(amountInCents * (DEFAULT_COMMISSION_RATE / 100));
        const creatorPayout = amountInCents - platformFee;

       
        await TransactionModel.createTransaction({
            fan_id: pod_fan_id,
            creator_id: pod_creator_id,
            type: 'Subscription',
            amount: amountInCents,
            platform_fee: platformFee,
            creator_payout: creatorPayout,
            status: 'Cleared',
            payment_gateway_id: invoice.id,
        });

        // Get current_period_end from the subscription line item
        const currentPeriodEnd = subscriptionLineItem.period?.end;
        
        if (currentPeriodEnd) {
            const nextBillingDate = new Date(currentPeriodEnd * 1000);
            await supabase
                .from('subscriptions')
                .update({ next_billing_date: nextBillingDate.toISOString(), status: 'active' })
                .eq('stripe_subscription_id', stripeSubscriptionId);
        }
        
        console.log(`[Webhook] Subscription transaction for ${amountInCents/100} USD saved to database.`);
        
    }
    return { received: true };
};
