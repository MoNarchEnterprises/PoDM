import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';
import * as StripeService from '../services/stripe.service';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-08-27.basil',
});

/**
 * @desc    Create a Stripe Connect onboarding link
 * @route   POST /api/v1/stripe/connect/onboarding-link
 * @access  Private (Creators only)
 */
export const createAccountLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?._id;
        if (!creatorId) {
            throw new AppError('Authentication error, creator ID not found.', 401);
        }

        const url = await StripeService.createStripeAccountLink(creatorId);
        res.status(200).json({ success: true, data: { url } });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Handle Stripe webhook events
 * @route   POST /api/v1/webhooks/stripe
 * @access  Public (Stripe only)
 */
export const handleWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    console.error(`[Webhook Debug] Signature: ${sig ? 'Present' : 'Missing'}`);
    console.error(`[Webhook Debug] Secret loaded: ${webhookSecret ? 'Yes (' + webhookSecret.substring(0, 10) + '...)' : 'No'}`);
    console.error(`[Webhook Debug] Body type: ${typeof req.body}`);
    console.error(`[Webhook Debug] Body is Buffer: ${Buffer.isBuffer(req.body)}`);

    if (!Buffer.isBuffer(req.body)) {
        console.error('[Webhook Debug] Body content:', JSON.stringify(req.body));
    }

    if (!webhookSecret) {
        console.error('⚠️  Webhook secret not configured');
        return res.status(500).send('Webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
        // Verify the webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
        console.error(`⚠️  Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    console.log(`✅ Received webhook event: ${event.type}`);

    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                console.log(`💰 PaymentIntent succeeded: ${paymentIntent.id}`);
                // TODO: Update database with successful payment
                break;

            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object as Stripe.PaymentIntent;
                console.log(`❌ PaymentIntent failed: ${failedPayment.id}`);
                // TODO: Handle failed payment
                break;

            case 'customer.subscription.created':
                const newSubscription = event.data.object as Stripe.Subscription;
                console.log(`🎉 Subscription created: ${newSubscription.id}`);
                // TODO: Create subscription record in database
                break;

            case 'customer.subscription.updated':
                const updatedSubscription = event.data.object as Stripe.Subscription;
                console.log(`🔄 Subscription updated: ${updatedSubscription.id}`);
                // TODO: Update subscription in database
                break;

            case 'customer.subscription.deleted':
                const deletedSubscription = event.data.object as Stripe.Subscription;
                console.log(`🗑️  Subscription deleted: ${deletedSubscription.id}`);
                // TODO: Mark subscription as cancelled in database
                break;

            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                console.log(`✅ Checkout session completed: ${session.id}`);
                // TODO: Handle successful checkout
                break;

            default:
                console.log(`ℹ️  Unhandled event type: ${event.type}`);
        }

        // Return a 200 response to acknowledge receipt of the event
        res.json({ received: true });
    } catch (error: any) {
        console.error(`❌ Error processing webhook: ${error.message}`);
        res.status(500).send(`Webhook processing error: ${error.message}`);
    }
};