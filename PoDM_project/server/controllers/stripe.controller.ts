import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';
import * as StripeService from '../services/stripe.service';

/**
 * @desc    Create a Stripe Connect onboarding link
 * @route   POST /api/v1/stripe/connect/onboarding-link
 * @access  Private (Creators only)
 */
export const createAccountLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?._id;
        if (!creatorId) {
            throw new AppError('Authentication error, creator ID not found.', 401);
        }

        const url = await StripeService.createStripeAccountLink(creatorId);
        res.status(200).json({ success: true, data: { url } });

    } catch (error) {
        next(error);
    }
};