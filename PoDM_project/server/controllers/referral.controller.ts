import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';
import * as ReferralModel from '../models/referral.model';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../utils/requestHelpers';
import { ok } from '../utils/response';

export const getMyReferralCodes = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const referrals = await ReferralModel.getReferralsByUserId(userId);
    res.json({ referrals });
});

export const generateReferralCodes = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const username = req.user?.username;

    if (!username) {
        throw new AppError('Unauthorized or missing username', 401);
    }

    const existing = await ReferralModel.getReferralsByUserId(userId);
    if (existing.length > 0) {
        throw new AppError('Referral codes already generated', 400);
    }

    const referrals = await ReferralModel.generateReferralCodes(userId, username);
    res.json({ referrals });
});

export const getReferralStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const stats = await ReferralModel.getReferralStats(userId);
    res.json(stats);
});

export const validateReferralCode = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;
    const referral = await ReferralModel.validateReferralCode(code);

    if (!referral) {
        res.status(404).json({ valid: false, error: 'Invalid or inactive referral code' });
        return;
    }

    res.json({
        valid: true,
        bonusType: referral.bonus_type,
        bonusValue: referral.bonus_value
    });
});

export const checkMilestoneBonus = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { totalEarnings } = req.body;

    if (!userId || totalEarnings === undefined) {
        throw new AppError('userId and totalEarnings are required', 400);
    }

    await ReferralModel.checkAndAwardMilestoneBonus(userId, totalEarnings);

    ok(res, { message: 'Milestone check completed' });
});
