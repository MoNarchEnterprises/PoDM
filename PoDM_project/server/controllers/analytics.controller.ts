import { Request, Response, NextFunction } from 'express';
import * as AnalyticsService from '../services/analytics.service';
import { AppError } from '../middleware/error.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const logEvent = asyncHandler(async (req: Request, res: Response) => {
    const viewerId = req.user?.id || null;
    const { eventType, creatorId, contentId } = req.body;

    if (!eventType || !creatorId) {
        throw new AppError('eventType and creatorId are required.', 400);
    }

    const result = await AnalyticsService.logAnalyticsEvent({
        eventType,
        creatorId,
        viewerId,
        contentId,
    });
    res.status(200).json(result);
});
