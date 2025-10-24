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
        const creatorId = req.user?._id;
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
        const creatorId = req.user?._id;
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
        const creatorId = req.user?._id;
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
        const creatorId = req.user?._id;
        // Log the incoming body to see exactly what the frontend is sending.
        console.log('[Payout Controller] Received payout request with body:', req.body);

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
        const creatorId = req.user?._id;
        if (!creatorId) throw new AppError('Authentication error.', 401);

        const bannerFile = req.file;
        // When using FormData, non-file fields are sent as strings.
        // We need to parse them back into objects.
        const profileData = req.body.profile ? JSON.parse(req.body.profile) : {};
        const creatorData = req.body.creatorData ? JSON.parse(req.body.creatorData) : {};
        
        const settingsData = {
            profile: profileData,
            creatorData: creatorData
        };

        // The service now handles both the file and the text data
        const updatedCreator = await CreatorService.updateSettings(creatorId, settingsData, bannerFile);
        res.status(200).json({ success: true, data: updatedCreator });

    } catch (error) {
        console.error('--- ERROR IN updateCreatorSettings CONTROLLER ---');
        console.error(error);
        console.error('--- END OF ERROR ---');
        next(error);
    }
};