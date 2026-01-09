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
 * Helper to process a successful payment intent and create/update records.
 */
export const processSuccessfulPaymentIntent = async (paymentIntent: Stripe.PaymentIntent) => {
    const transactionType = paymentIntent.metadata.transaction_type;

    // 1. Check for duplicates
    const existingTransaction = await TransactionModel.findTransactionByPaymentGatewayId(paymentIntent.id);
    if (existingTransaction) {
        return existingTransaction;
    }

    // 2. Extract common data
    const { fan_id, creator_id, content_id } = paymentIntent.metadata;
    const amountInCents = paymentIntent.amount;
    const platformFee = Math.round(amountInCents * (DEFAULT_COMMISSION_RATE / 100));
    const creatorPayout = amountInCents - platformFee;

    let transaction: any = null;

    try {
        if (transactionType === 'tip') {
            const { fan_message, related_content_id } = paymentIntent.metadata;
            transaction = await TransactionModel.createTransaction({
                fan_id,
                creator_id,
                type: 'Tip',
                amount: amountInCents,
                platform_fee: platformFee,
                creator_payout: creatorPayout,
                status: 'Cleared',
                payment_gateway_id: paymentIntent.id,
                related_content_id: related_content_id,
                message: fan_message,
            });

            if (related_content_id) {
                const { error: rpcError } = await supabase.rpc('increment_tip_count', { content_id_to_update: related_content_id, tip_amount: amountInCents });
                if (rpcError) console.error('Error incrementing tip count:', rpcError);
            }

        } else if (transactionType === 'ppv_message') {
            const { message_id } = paymentIntent.metadata;
            transaction = await TransactionModel.createTransaction({
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

            // Update PPV Earnings on the content
            if (content_id) {
                const { error: rpcError } = await supabase.rpc('increment_ppv_earnings', { content_id_to_update: content_id, amount: amountInCents });
                if (rpcError) console.error('Error incrementing ppv earnings for message:', rpcError);
            }

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
            }

        } else if (transactionType === 'ppv_post') {
            transaction = await TransactionModel.createTransaction({
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

            // Update PPV Earnings on the content
            if (content_id) {
                const { error: rpcError } = await supabase.rpc('increment_ppv_earnings', { content_id_to_update: content_id, amount: amountInCents });
                if (rpcError) console.error('Error incrementing ppv earnings for post:', rpcError);
            }
        }

        return transaction;

    } catch (error: any) {
        throw error;
    }
};

/**
 * Manually confirms a transaction exists for a given PaymentIntent ID.
 * Useful for frontend to ensure transaction is recorded after client-side confirmation.
 */
export const confirmTransaction = async (paymentIntentId: string) => {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
        throw new AppError(`Payment is not successful (status: ${paymentIntent.status})`, 400);
    }

    return processSuccessfulPaymentIntent(paymentIntent);
};

/**
 * Handles the business logic for a fan sending a tip to a creator.
 */
export const sendTipToCreator = async (fanId: string, creatorId: string, amountInCents: number, message: string | undefined, contentId: string, paymentMethodId?: string) => {
    if (amountInCents < 100) {
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



        // For tips, always let the frontend handle confirmation to support 3D Secure
        if (paymentMethodId) {
            paymentIntentConfig.payment_method = paymentMethodId;
            // Don't set confirm:true - let the frontend always confirm via stripe.confirmCardPayment()
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig);



        // Don't attempt immediate processing for tips - let frontend confirm first
        // Transactions will be created either:
        // 1. Via frontend calling confirmTransaction after successful confirmation
        // 2. Via webhook when payment_intent.succeeded fires

        return {
            clientSecret: paymentIntent.client_secret,
            status: paymentIntent.status,
            paymentIntentId: paymentIntent.id
        };
    } catch (err: any) {
        console.error("[TIP DEBUG] Error creating PaymentIntent:", err);
        throw new AppError(`Failed to create payment intent: ${err.message}`, 500);
    }
};

/**
 * Creates a Stripe Payment Intent for unlocking paid content in a message.
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
    // console.log('[PaymentService] Creating and confirming PaymentIntent with metadata:', metadataPayload);

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

        if (paymentIntent.status === 'succeeded') {
            await processSuccessfulPaymentIntent(paymentIntent);
        }

        return {
            clientSecret: paymentIntent.client_secret,
            status: paymentIntent.status,
            paymentIntentId: paymentIntent.id
        };
    } catch (err: any) {
        if (err.code === 'authentication_required') {
            return {
                clientSecret: err.raw.payment_intent.client_secret,
                status: 'requires_action',
                paymentIntentId: err.raw.payment_intent.id
            };
        }
        console.error("Stripe Payment Intent creation/confirmation failed:", err.message);
        throw new AppError(`Payment failed: ${err.message}`, 400);
    }
};

/**
 * Creates a Stripe Payment Intent for unlocking a paid post.
 */
export const createPostUnlockIntent = async (fanId: string, contentId: string) => {
    const content = await ContentModel.findContentById(contentId);
    if (!content || content.visibility !== 'pay_per_view' || !content.price) {
        throw new AppError('This content is not available for purchase.', 400);
    }

    // Enforce subscription requirement
    const activeSubs = await SubscriptionModel.findActiveSubscriptionsByFan(fanId);
    // console.log(`[PaymentService] Checking subscription for fan ${fanId} and creator ${content.creator_id}`);
    // console.log(`[PaymentService] Active subs:`, activeSubs?.length, activeSubs?.map(s => s.creator_id));

    const isSubscribed = activeSubs?.some(sub => sub.creator_id === content.creator_id);
    if (!isSubscribed) {
        throw new AppError('You must be subscribed to this creator to unlock this content.', 403);
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

        if (paymentIntent.status === 'succeeded') {
            await processSuccessfulPaymentIntent(paymentIntent);
        }

        return {
            clientSecret: paymentIntent.client_secret,
            status: paymentIntent.status,
            paymentIntentId: paymentIntent.id
        };
    } catch (err: any) {
        if (err.code === 'authentication_required') {
            return {
                clientSecret: err.raw.payment_intent.client_secret,
                status: 'requires_action',
                paymentIntentId: err.raw.payment_intent.id
            };
        }
        console.error("Stripe Payment Intent creation/confirmation failed:", err.message);
        throw new AppError(`Payment failed: ${err.message}`, 400);
    }
};

/**
 * Handles incoming webhook events from Stripe.
 */
export const handleStripeWebhookEvent = async (event: Stripe.Event) => {
    console.log(`[Webhook] Received event: ${event.type}`);

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await processSuccessfulPaymentIntent(paymentIntent);

    } else if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object as Stripe.Invoice;

        // Get subscription ID from invoice lines
        const subscriptionLineItem = invoice.lines.data.find(line => typeof line.subscription === 'string' && line?.subscription.length > 0);

        if (!subscriptionLineItem || !subscriptionLineItem.subscription) {
            console.error('[Webhook] Invoice paid, but no subscription line item found. Skipping transaction creation.');
            return;
        }

        const stripeSubscriptionId = subscriptionLineItem.subscription as string;
        const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const { pod_fan_id, pod_creator_id } = stripeSubscription.metadata;
        const amountInCents = invoice.amount_paid;

        if (!pod_fan_id || !pod_creator_id) {
            console.error(`[Webhook] Subscription ${stripeSubscriptionId} invoice paid, but missing metadata. Cannot create transaction.`);
            return;
        }

        const platformFee = Math.round(amountInCents * (DEFAULT_COMMISSION_RATE / 100));
        const creatorPayout = amountInCents - platformFee;

        // Check duplicate for invoice
        if (!invoice.id) {
            console.error('[Webhook] Invoice ID missing. Skipping.');
            return { received: true };
        }
        const existingTransaction = await TransactionModel.findTransactionByPaymentGatewayId(invoice.id);
        if (existingTransaction) {
            console.log(`[Webhook] Invoice Transaction ${invoice.id} already exists. Skipping.`);
            return { received: true };
        }

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

        const currentPeriodEnd = subscriptionLineItem.period?.end;
        if (currentPeriodEnd) {
            const nextBillingDate = new Date(currentPeriodEnd * 1000);
            await supabase
                .from('subscriptions')
                .update({ next_billing_date: nextBillingDate.toISOString(), status: 'active' })
                .eq('stripe_subscription_id', stripeSubscriptionId);
        }

        console.log(`[Webhook] Subscription transaction for ${amountInCents / 100} USD saved to database.`);
    } else if (event.type === 'customer.subscription.updated') {
        const stripeSubscription = event.data.object as any;
        console.log(`[Webhook] Subscription updated: ${stripeSubscription.id}, status: ${stripeSubscription.status}`);

        const updates: any = {
            status: stripeSubscription.status,
            next_billing_date: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        };

        // If canceled_at is set, it might be canceling at period end
        if (stripeSubscription.cancel_at_period_end) {
            // We can optionally store this flag if we had a column for it
            console.log(`[Webhook] Subscription ${stripeSubscription.id} set to cancel at period end.`);
        }

        const { error } = await supabase
            .from('subscriptions')
            .update(updates)
            .eq('stripe_subscription_id', stripeSubscription.id);

        if (error) {
            console.error(`[Webhook] Failed to update subscription ${stripeSubscription.id}:`, error.message);
        }

    } else if (event.type === 'customer.subscription.deleted') {
        const stripeSubscription = event.data.object as any;
        console.log(`[Webhook] Subscription deleted/canceled: ${stripeSubscription.id}`);

        const { error } = await supabase
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('stripe_subscription_id', stripeSubscription.id);

        if (error) {
            console.error(`[Webhook] Failed to cancel subscription ${stripeSubscription.id}:`, error.message);
        }
    }
    return { received: true };
};
