// /server/controllers/creator.controller.ts

import { Request, Response, NextFunction } from 'express';
import * as CreatorService from '../services/creator.service';
import { AppError } from '../middleware/error.middleware';

/**
 * @desc    Get all data for the creator dashboard
 * @route   GET /api/v1/creator/dashboard
 * @access  Private (Creators only)
 */
export const getCreatorDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?.id;
        if (!creatorId) {
            throw new AppError('Authentication error, creator ID not found.', 401);
        }

        const dashboardData = await CreatorService.getDashboardData(creatorId);
        res.status(200).json({ success: true, data: dashboardData });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all data for the creator analytics page
 * @route   GET /api/v1/creator/analytics
 * @access  Private (Creators only)
 */
export const getCreatorAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?.id;
        if (!creatorId) {
            throw new AppError('Authentication error, creator ID not found.', 401);
        }
        const analyticsData = await CreatorService.getAnalyticsData(creatorId);
        res.status(200).json({ success: true, data: analyticsData });
    } catch (error) {
        next(error);
    }
};
/**
 * @desc    Get all data for the creator earnings page
 * @route   GET /api/v1/creator/earnings
 * @access  Private (Creators only)
 */
export const getCreatorEarnings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?.id;
        if (!creatorId) {
            throw new AppError('Authentication error, creator ID not found.', 401);
        }

        const earningsData = await CreatorService.getEarningsData(creatorId);
        res.status(200).json({ success: true, data: earningsData });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Handle a creator payout request
 * @route   POST /api/v1/creator/payouts
 * @access  Private (Creators only)
 */
export const requestPayout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?.id;
        // Safely parse the amount from the request body.
        const amount = parseFloat(req.body.amount);

        if (!creatorId) {
            throw new AppError('Authentication error, creator ID not found.', 401);
        }
        if (isNaN(amount) || amount <= 0) {
            throw new AppError('A valid, positive payout amount is required.', 400);
        }

        // Convert amount from dollars to cents for the service
        const amountInCents = Math.round(amount * 100);

        const result = await CreatorService.createPayout(creatorId, amountInCents);
        res.status(200).json(result);
    } catch (error) {
        console.error('[Payout Controller] Error processing payout:', error);
        next(error);
    }
};

/**
 * @desc    Update settings for the currently logged-in creator
 * @route   PUT /api/v1/creator/settings
 * @access  Private (Creators only)
 */
export const updateCreatorSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?.id;
        if (!creatorId) throw new AppError('Authentication error.', 401);

        const bannerFile = req.file;
        // When using FormData, non-file fields are sent as strings.
        // We need to parse them back into objects.
        const profileData = req.body.profile ? JSON.parse(req.body.profile) : {};

        // FIX: Check for 'creatorData' (camelCase) first as sent by frontend, fallback to 'creator_data'
        const rawCreatorData = req.body.creatorData || req.body.creator_data;
        const creator_data = rawCreatorData ? JSON.parse(rawCreatorData) : {};

        const settingsData = {
            profile: profileData,
            creator_data: creator_data
        };

        // The service now handles both the file and the text data
        const updatedCreator = await CreatorService.updateSettings(creatorId, settingsData, bannerFile);
        res.status(200).json({ success: true, data: updatedCreator });

    } catch (error) {
        console.error('Error in updateCreatorSettings:', error);
        next(error);
    }
};

/**
 * @desc    Get all recent activity for the creator
 * @route   GET /api/v1/creator/activity
 * @access  Private (Creators only)
 */
export const getCreatorActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?.id;
        if (!creatorId) {
            throw new AppError('Authentication error, creator ID not found.', 401);
        }

        const { page = '1', limit = '10' } = req.query;
        const pageNumber = parseInt(page as string, 10);
        const limitNumber = parseInt(limit as string, 10);

        const activityData = await CreatorService.getCreatorActivity(creatorId, pageNumber, limitNumber);
        res.status(200).json({ success: true, data: activityData });
    } catch (error) {
    }
};

/**
 * @desc    Get subscription tiers for the logged-in creator
 * @route   GET /api/v1/creator/tiers
 * @access  Private (Creators only)
 */
export const getTiers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?.id;
        if (!creatorId) {
            throw new AppError('Authentication error, creator ID not found.', 401);
        }

        const tiers = await CreatorService.getCreatorTiers(creatorId);
        res.status(200).json({ success: true, data: tiers });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Send a broadcast message to subscribers
 * @route   POST /api/v1/creator/broadcast
 * @access  Private (Creators only)
 */
export const broadcastMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?.id;
        if (!creatorId) throw new AppError('Authentication error.', 401);

        const { text, minTierId } = req.body;
        if (!text) throw new AppError('Message text is required.', 400);

        const result = await CreatorService.broadcastMessage(creatorId, text, minTierId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
