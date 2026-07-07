import { Router } from 'express';
import { createOnRampSession, handleOnRampWebhook } from '../controllers/onramp.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/v1/payments/onramp/session
 * @desc    Create a Coinbase On-Ramp session for card-to-USDC purchase
 * @access  Private (Fans only)
 */
router.post('/session', protect, createOnRampSession);

/**
 * @route   POST /api/v1/payments/onramp/webhook
 * @desc    Receive Coinbase On-Ramp webhook events
 * @access  Public (secured by HMAC signature)
 */
router.post('/webhook', handleOnRampWebhook);

export default router;
