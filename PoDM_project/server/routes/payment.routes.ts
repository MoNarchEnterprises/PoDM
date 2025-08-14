import { Router } from 'express';
// --- Import Controllers & Middleware ---
// We will create these in later steps
// import { sendTip, handleStripeWebhook } from '../controllers/payments.controller';
// import { protect } from '../middleware/auth.middleware';
// import { verifyStripeSignature } from '../middleware/stripe.middleware';

const router = Router();

/**
 * @route   POST /api/v1/payments/tip
 * @desc    Send a tip to a creator
 * @access  Private (Fans only)
 */
// router.post('/tip', protect, sendTip);

/**
 * @route   POST /api/v1/payments/stripe/webhooks
 * @desc    Handle incoming webhooks from Stripe to confirm payments
 * @access  Public (but protected by Stripe signature verification)
 */
// router.post('/stripe/webhooks', verifyStripeSignature, handleStripeWebhook);


export default router;
