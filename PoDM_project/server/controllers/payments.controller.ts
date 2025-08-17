import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';

// --- Import Service Functions ---
import * as PaymentService from '../services/payment.service';

/**
 * @desc    Send a tip to a creator
 * @route   POST /api/v1/payments/tip
 * @access  Private (Fans only)
 */
export const sendTip = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const fanId = req.user?.id;
        const { creatorId, amount, message } = req.body; // amount should be in cents

        if (!fanId) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }
        if (!creatorId || !amount) {
            throw new AppError('Creator ID and amount are required to send a tip.', 400);
        }
        if (amount < 100) { // Example: minimum tip of $1.00
            throw new AppError('Tip amount must be at least $1.00.', 400);
        }

        const result = await PaymentService.sendTipToCreator(fanId, creatorId, amount, message);

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Handle incoming webhooks from Stripe to confirm payments
 * @route   POST /api/v1/payments/stripe/webhooks
 * @access  Public (but protected by Stripe signature verification middleware)
 */
export const handleStripeWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // The `verifyStripeSignature` middleware has already validated the event
        // and attached it to the request body.
        const event = req.body;

        await PaymentService.handleStripeWebhookEvent(event);

        // Return a 200 response to acknowledge receipt of the event to Stripe
        res.status(200).json({ received: true });
    } catch (error) {
        next(error);
    }
};
