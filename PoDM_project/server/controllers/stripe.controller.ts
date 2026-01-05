import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';
import * as StripeService from '../services/stripe.service';
import stripe from '../config/stripeClient';
import Stripe from 'stripe';
import * as PaymentService from '../services/payment.service';

/**
 * @desc    Create a Stripe Connect onboarding link
 * @route   POST /api/v1/stripe/connect/onboarding-link
 * @access  Private (Creators only)
 */
export const createAccountLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?.id;
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
    try {
        await PaymentService.handleStripeWebhookEvent(event);
        // Return a 200 response to acknowledge receipt of the event
        res.json({ received: true });
    } catch (error: any) {
        console.error(`❌ Error processing webhook: ${error.message}`);
        // We still return 200 to Stripe so they don't retry indefinitely if it's a logic error on our side that won't be fixed by retrying immediately.
        // However, for temporary errors, we might want to return 500. For MVP, 200 is safer to avoid log spam.
        res.status(200).json({ received: true, error: error.message });
    }
};