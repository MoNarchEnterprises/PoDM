import { Router } from 'express';

// --- Import Controllers & Middleware ---
import { sendTip, unlockMessageContent, unlockPost } from '../controllers/payments.controller';
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



/**
 * @route   POST /api/v1/payments/unlock-post
 * @desc    Create a Payment Intent to unlock a paid post.
 * @access  Private (Fans only)
 */
router.post('/unlock-post', protect, unlockPost);

/**
 * @route   POST /api/v1/payments/confirm-transaction
 * @desc    Manually confirm a transaction after client-side payment confirmation.
 * @access  Private (Fans only)
 */
import { confirmTransaction } from '../controllers/payments.controller';
router.post('/confirm-transaction', protect, confirmTransaction);

// The Stripe webhook route is now handled directly in server.ts

export default router;