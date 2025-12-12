import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';

// --- Import Service Functions ---
import * as SubscriptionService from '../services/subscription.service';

/**
 * @desc    Get all of the current fan's subscriptions
 * @route   GET /api/v1/subscriptions
 * @access  Private (Fans only)
 */
export const getMySubscriptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const fan_id = req.user?.id;
        if (!fan_id) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        const subscriptions = await SubscriptionService.getFanSubscriptions(fan_id);
        res.status(200).json({ success: true, data: subscriptions });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create a new subscription to a creator's tier
 * @route   POST /api/v1/subscriptions
 * @access  Private (Fans only)
 */
export const createSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const fan_id = req.user?.id;
        const { creator_id, tier_id, paymentMethodId } = req.body;

        if (!fan_id) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }
        if (!creator_id || !tier_id || !paymentMethodId) {
            throw new AppError('Creator ID, Tier ID, and Payment Method ID are required.', 400);
        }

        const newSubscription = await SubscriptionService.createSubscriptionForUser(fan_id, creator_id, tier_id, paymentMethodId);
        res.status(201).json({ success: true, data: newSubscription });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update a subscription (e.g., change tier)
 * @route   PUT /api/v1/subscriptions/:id
 * @access  Private (Owner only)
 */
export const updateSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const fan_id = req.user?.id;
        const { id: subscriptionId } = req.params;
        const { newTierId } = req.body;

        if (!fan_id) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }
        if (!newTierId) {
            throw new AppError('New Tier ID is required.', 400);
        }

        const updatedSubscription = await SubscriptionService.changeSubscriptionTier(subscriptionId, fan_id, newTierId);
        res.status(200).json({ success: true, data: updatedSubscription });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Cancel a subscription (sets status to 'canceled')
 * @route   DELETE /api/v1/subscriptions/:id
 * @access  Private (Owner only)
 */
export const cancelSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const fan_id = req.user?.id;
        const { id: subscriptionId } = req.params;

        if (!fan_id) {
            throw new AppError('Authentication error, user ID not found.', 401);
        }

        const canceledSubscription = await SubscriptionService.cancelFanSubscription(subscriptionId, fan_id);
        res.status(200).json({ success: true, data: canceledSubscription });
    } catch (error) {
        next(error);
    }
};
