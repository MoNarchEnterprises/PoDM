import { Router } from 'express';
import { createAccountLink } from '../controllers/stripe.controller';
import { protect, creatorOnly } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/v1/stripe/connect/onboarding-link
 * @desc    Create a Stripe Connect onboarding link
 * @access  Private (Creators only)
 */
router.post('/connect/onboarding-link', protect, creatorOnly, createAccountLink);

export default router;