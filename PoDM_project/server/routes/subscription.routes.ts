import { Router } from 'express';
// --- Import Controllers & Middleware ---
// We will create these in later steps
// import { createSubscription, updateSubscription, cancelSubscription, getMySubscriptions } from '../controllers/subscription.controller';
// import { protect } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/v1/subscriptions
 * @desc    Get all of the current fan's subscriptions
 * @access  Private (Fans only)
 */
// router.get('/', protect, getMySubscriptions);

/**
 * @route   POST /api/v1/subscriptions
 * @desc    Create a new subscription to a creator's tier
 * @access  Private (Fans only)
 */
// router.post('/', protect, createSubscription);

/**
 * @route   PUT /api/v1/subscriptions/:id
 * @desc    Update a subscription (e.g., change tier)
 * @access  Private (Owner only)
 */
// router.put('/:id', protect, updateSubscription);

/**
 * @route   DELETE /api/v1/subscriptions/:id
 * @desc    Cancel a subscription (sets status to 'canceled')
 * @access  Private (Owner only)
 */
// router.delete('/:id', protect, cancelSubscription);


export default router;
