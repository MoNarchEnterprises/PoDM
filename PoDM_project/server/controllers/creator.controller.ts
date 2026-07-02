import { Request, Response, NextFunction } from 'express';
import * as CreatorService from '../services/creator.service';
import { AppError } from '../middleware/error.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../utils/requestHelpers';
import { ok } from '../utils/response';

export const getCreatorDashboard = asyncHandler(async (req: Request, res: Response) => {
    const creatorId = requireAuth(req, 'creator');
    const dashboardData = await CreatorService.getDashboardData(creatorId);
    ok(res, dashboardData);
});

export const getCreatorAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const creatorId = requireAuth(req, 'creator');
    const analyticsData = await CreatorService.getAnalyticsData(creatorId);
    ok(res, analyticsData);
});

export const exportMetrics = asyncHandler(async (req: Request, res: Response) => {
    const creatorId = requireAuth(req, 'creator');
    const format = req.query.format as string;
    if (format !== 'csv') {
        throw new AppError('Unsupported format. Please use format=csv', 400);
    }

    const csvData = await CreatorService.exportMetricsCSV(creatorId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=metrics_export.csv');
    res.status(200).send(csvData);
});

export const exportFanEngagement = asyncHandler(async (req: Request, res: Response) => {
    const creatorId = requireAuth(req, 'creator');
    const format = req.query.format as string;
    if (format !== 'csv') {
        throw new AppError('Unsupported format. Please use format=csv', 400);
    }

    const csvData = await CreatorService.exportFanEngagementCSV(creatorId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=fan_engagement_export.csv');
    res.status(200).send(csvData);
});

export const getCreatorEarnings = asyncHandler(async (req: Request, res: Response) => {
    const creatorId = requireAuth(req, 'creator');
    const earningsData = await CreatorService.getEarningsData(creatorId);
    ok(res, earningsData);
});

export const requestPayout = asyncHandler(async (req: Request, res: Response) => {
    const creatorId = requireAuth(req, 'creator');
    const amount = parseFloat(req.body.amount);

    if (isNaN(amount) || amount <= 0) {
        throw new AppError('A valid, positive payout amount is required.', 400);
    }

    const amountInCents = Math.round(amount * 100);
    const result = await CreatorService.createPayout(creatorId, amountInCents);
    res.status(200).json(result);
});

export const updateCreatorSettings = asyncHandler(async (req: Request, res: Response) => {
    const creatorId = requireAuth(req);
    if (!creatorId) throw new AppError('Authentication error.', 401);

    const bannerFile = req.file;
    const profileData = req.body.profile ? JSON.parse(req.body.profile) : {};
    const rawCreatorData = req.body.creatorData || req.body.creator_data;
    const creator_data = rawCreatorData ? JSON.parse(rawCreatorData) : {};

    const settingsData = {
        profile: profileData,
        creator_data: creator_data
    };

    const updatedCreator = await CreatorService.updateSettings(creatorId, settingsData, bannerFile);
    ok(res, updatedCreator);
});

export const getCreatorActivity = asyncHandler(async (req: Request, res: Response) => {
    const creatorId = requireAuth(req, 'creator');

    const { page = '1', limit = '10' } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    const activityData = await CreatorService.getCreatorActivity(creatorId, pageNumber, limitNumber);
    ok(res, activityData);
});

export const getTiers = asyncHandler(async (req: Request, res: Response) => {
    const creatorId = requireAuth(req, 'creator');
    const tiers = await CreatorService.getCreatorTiers(creatorId);
    ok(res, tiers);
});

export const broadcastMessage = asyncHandler(async (req: Request, res: Response) => {
    const creatorId = requireAuth(req);
    if (!creatorId) throw new AppError('Authentication error.', 401);

    const { text, minTierId } = req.body;
    if (!text) throw new AppError('Message text is required.', 400);

    const result = await CreatorService.broadcastMessage(creatorId, text, minTierId);
    res.status(200).json(result);
});
