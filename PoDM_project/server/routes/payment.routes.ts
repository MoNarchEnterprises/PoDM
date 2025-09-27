import { Router } from 'express';

// --- Import Controllers & Middleware ---
import { sendTip, unlockMessageContent } from '../controllers/payments.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/v1/payments/tip
 * @desc    Send a tip to a creator
 * @access  Private (Fans only)
 */
router.post('/tip', protect, sendTip);

/**
 * @route   POST /api/v1/payments/unlock-message
 * @desc    Create a Payment Intent to unlock paid content in a message
 * @access  Private (Fans only)
 */
router.post('/unlock-message', protect, unlockMessageContent);

// The Stripe webhook route is now handled directly in server.ts

export default router;