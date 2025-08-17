import express from 'express';

// --- Import Controllers & Middleware ---
import { sendTip, handleStripeWebhook } from '../controllers/payments.controller';
import { protect } from '../middleware/auth.middleware';
import { verifyStripeSignature } from '../middleware/stripe.middleware';

const router = express.Router();

/**
 * @route   POST /api/v1/payments/tip
 * @desc    Send a tip to a creator
 * @access  Private (Fans only)
 */
router.post('/tip', protect, sendTip);

/**
 * @route   POST /api/v1/payments/stripe/webhooks
 * @desc    Handle incoming webhooks from Stripe to confirm payments
 * @access  Public (but protected by Stripe signature verification)
 */
// Stripe requires the raw request body for signature verification.
// This middleware is applied specifically to this route.
router.post('/stripe/webhooks', express.raw({type: 'application/json'}), verifyStripeSignature, handleStripeWebhook);


export default router;
