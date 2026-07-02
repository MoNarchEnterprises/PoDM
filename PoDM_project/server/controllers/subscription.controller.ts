import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';
import * as SubscriptionService from '../services/subscription.service';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../utils/requestHelpers';
import { ok, created } from '../utils/response';

export const getMySubscriptions = asyncHandler(async (req: Request, res: Response) => {
    const fan_id = requireAuth(req);
    const subscriptions = await SubscriptionService.getFanSubscriptions(fan_id);
    ok(res, subscriptions);
});

export const createSubscription = asyncHandler(async (req: Request, res: Response) => {
    const fan_id = requireAuth(req);
    const { creator_id, tier_id, paymentMethodId } = req.body;

    if (!creator_id || !tier_id || !paymentMethodId) {
        throw new AppError('Creator ID, Tier ID, and Payment Method ID are required.', 400);
    }

    const newSubscription = await SubscriptionService.createSubscriptionForUser(fan_id, creator_id, tier_id, paymentMethodId);
    created(res, newSubscription);
});

export const updateSubscription = asyncHandler(async (req: Request, res: Response) => {
    const fan_id = requireAuth(req);
    const { id: subscriptionId } = req.params;
    const { newTierId } = req.body;

    if (!newTierId) {
        throw new AppError('New Tier ID is required.', 400);
    }

    const updatedSubscription = await SubscriptionService.changeSubscriptionTier(subscriptionId, fan_id, newTierId);
    ok(res, updatedSubscription);
});

export const cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
    const fan_id = requireAuth(req);
    const { id: subscriptionId } = req.params;

    const canceledSubscription = await SubscriptionService.cancelFanSubscription(subscriptionId, fan_id);
    ok(res, canceledSubscription);
});
