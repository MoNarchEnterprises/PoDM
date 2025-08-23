import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { AppError } from './error.middleware';

// --- Import the initialized Stripe client ---
import stripe from '../config/stripeClient';

/**
 * Verifies the signature of an incoming Stripe webhook request.
 * This is a critical security measure to ensure that the request is
 * genuinely from Stripe and has not been tampered with.
 *
 * IMPORTANT: This middleware requires the raw request body. You must ensure
 * that the webhook route in your `server.ts` uses `express.raw({type: 'application/json'})`
 * BEFORE `express.json()`.
 */
export const verifyStripeSignature = (req: Request, res: Response, next: NextFunction) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('Stripe webhook secret is not set.');
        return next(new AppError('Webhook configuration error.', 500));
    }

    const signature = req.headers['stripe-signature'];

    if (!signature) {
        return next(new AppError('No Stripe signature found.', 400));
    }

    try {
        // Construct the event using the raw request body, signature, and secret.
        // This will throw an error if the signature is invalid.
        const event = stripe.webhooks.constructEvent(
            req.body, // The raw request body buffer
            signature,
            webhookSecret
        );

        // Attach the verified event to the request object for the controller to use.
        req.body = event;

        next();
    } catch (err: any) {
        console.error('Error verifying Stripe webhook signature:', err.message);
        return next(new AppError(`Webhook Error: ${err.message}`, 400));
    }
};