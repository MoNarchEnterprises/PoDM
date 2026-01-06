import { Request, Response, NextFunction } from 'express';
import * as AnalyticsService from '../services/analytics.service';
import { AppError } from '../middleware/error.middleware';

export const logEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const viewerId = req.user?.id || null;
        const { eventType, creatorId, contentId } = req.body;

        console.log('[Analytics Controller] logEvent body:', req.body);

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
    } catch (error) {
        next(error);
    }
};