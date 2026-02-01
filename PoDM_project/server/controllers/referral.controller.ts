import { Request, Response } from 'express';
import * as ReferralModel from '../models/referral.model';

/**
 * Get current user's referral codes
 * GET /api/v1/referrals/my-codes
 */
export const getMyReferralCodes = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const referrals = await ReferralModel.getReferralsByUserId(userId);
        res.json({ referrals });
    } catch (error) {
        console.error('Error fetching referral codes:', error);
        res.status(500).json({ error: 'Failed to fetch referral codes' });
    }
};

/**
 * Generate referral codes for current user
 * POST /api/v1/referrals/generate
 */
export const generateReferralCodes = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const username = (req as any).user?.username;

        if (!userId || !username) {
            return res.status(401).json({ error: 'Unauthorized or missing username' });
        }

        // Check if user already has referral codes
        const existing = await ReferralModel.getReferralsByUserId(userId);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Referral codes already generated' });
        }

        const referrals = await ReferralModel.generateReferralCodes(userId, username);
        res.json({ referrals });
    } catch (error) {
        console.error('Error generating referral codes:', error);
        res.status(500).json({ error: 'Failed to generate referral codes' });
    }
};

/**
 * Get referral statistics for current user
 * GET /api/v1/referrals/stats
 */
export const getReferralStats = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const stats = await ReferralModel.getReferralStats(userId);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching referral stats:', error);
        res.status(500).json({ error: 'Failed to fetch referral stats' });
    }
};

/**
 * Validate a referral code (public endpoint)
 * GET /api/v1/referrals/validate/:code
 */
export const validateReferralCode = async (req: Request, res: Response) => {
    try {
        const { code } = req.params;

        const referral = await ReferralModel.validateReferralCode(code);

        if (!referral) {
            return res.status(404).json({ valid: false, error: 'Invalid or inactive referral code' });
        }

        res.json({
            valid: true,
            bonusType: referral.bonus_type,
            bonusValue: referral.bonus_value
        });
    } catch (error) {
        console.error('Error validating referral code:', error);
        res.status(500).json({ error: 'Failed to validate referral code' });
    }
};

/**
 * Webhook/callback to check milestone bonuses for a creator
 * This should be called when a creator's earnings are updated
 * POST /api/v1/referrals/check-milestone/:userId
 */
export const checkMilestoneBonus = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { totalEarnings } = req.body;

        if (!userId || totalEarnings === undefined) {
            return res.status(400).json({ error: 'userId and totalEarnings are required' });
        }

        await ReferralModel.checkAndAwardMilestoneBonus(userId, totalEarnings);

        res.json({ success: true, message: 'Milestone check completed' });
    } catch (error) {
        console.error('Error checking milestone bonus:', error);
        res.status(500).json({ error: 'Failed to check milestone bonus' });
    }
};
