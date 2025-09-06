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
 * @desc    Update settings for the currently logged-in creator
 * @route   PUT /api/v1/creator/settings
 * @access  Private (Creators only)
 */
export const updateCreatorSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?._id;
        if (!creatorId) {
            throw new AppError('Authentication error, creator ID not found.', 401);
        }

        const updatedCreator = await CreatorService.updateSettings(creatorId, req.body);
        res.status(200).json({ success: true, data: updatedCreator });

    } catch (error) {
        next(error);
    }
};