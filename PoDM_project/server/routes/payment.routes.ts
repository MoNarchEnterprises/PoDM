import { Router } from 'express';

// --- Import Controllers & Middleware ---
import { sendTip } from '../controllers/payments.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/v1/payments/tip
 * @desc    Send a tip to a creator
 * @access  Private (Fans only)
 */
router.post('/tip', protect, sendTip);

// The Stripe webhook route is now handled directly in server.ts

export default router;