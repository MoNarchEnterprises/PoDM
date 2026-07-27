import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../utils/requestHelpers';
import { ok, okMsg } from '../utils/response';
import * as FeatureFlagService from '../services/featureFlag.service';
import { AppError } from '../middleware/error.middleware';

export const getFlags = asyncHandler(async (req: Request, res: Response) => {
    const flags = await FeatureFlagService.getAllFlags();
    ok(res, flags);
});

export const getUserFlags = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const flags = await FeatureFlagService.getAllFlags();
    
    const resolvedFlags: Record<string, boolean> = {};
    for (const flag of flags) {
        resolvedFlags[flag.key] = await FeatureFlagService.isFeatureEnabled(flag.key, userId);
    }
    
    ok(res, resolvedFlags);
});

export const updateFlag = asyncHandler(async (req: Request, res: Response) => {
    const key = req.params.key;
    const updates = req.body;
    
    if (req.user?.role !== 'admin') {
         throw new AppError('Admin role required', 403);
    }
    
    const result = await FeatureFlagService.updateFlag(key, updates);
    okMsg(res, 'Flag updated successfully', result);
});

export const setOverride = asyncHandler(async (req: Request, res: Response) => {
    const { userId, flagKey, enabled, reason } = req.body;
    
    if (req.user?.role !== 'admin') {
         throw new AppError('Admin role required', 403);
    }
    
    if (!userId || !flagKey || enabled === undefined) {
         throw new AppError('userId, flagKey, and enabled are required', 400);
    }
    
    const result = await FeatureFlagService.setUserOverride(userId, flagKey, enabled, reason);
    okMsg(res, 'Override set successfully', result);
});
