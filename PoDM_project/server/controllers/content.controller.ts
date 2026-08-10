import { Request, Response, NextFunction } from 'express';
import * as ContentService from '../services/content.service';
import { AppError } from '../middleware/error.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../utils/requestHelpers';
import { ok, created, okMsg } from '../utils/response';

export const createContent = asyncHandler(async (req: Request, res: Response) => {
    const creator_id = requireAuth(req);

    const { title, description, type, visibility, tags } = req.body;
    const price = req.body.price ? Math.round(Number(req.body.price) * 100) : undefined;
    const scheduleIsScheduled = req.body.scheduleIsScheduled === 'true';
    const schedulePublishDate = req.body.schedulePublishDate || undefined;

    const files = req.files as Express.Multer.File[];

    if (!title || !type || !visibility || !files || files.length === 0) {
        throw new AppError('Title, type, visibility, and at least one file are required.', 400);
    }

    const schedule = {
        isScheduled: scheduleIsScheduled,
        publishDate: schedulePublishDate,
    };

    const newContent = await ContentService.createNewContent(
        creator_id,
        { title, description, type, visibility, price, tags, schedule, min_tier_level: req.body.min_tier_level ? Number(req.body.min_tier_level) : undefined },
        files
    );

    created(res, newContent);
});

export const getMyContent = asyncHandler(async (req: Request, res: Response) => {
    const creator_id = requireAuth(req);
    const content = await ContentService.getContentByCreatorId(creator_id, req.query);
    ok(res, content);
});

export const getContentByCreator = asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.params;
    const viewerId = req.user?.id;
    const content = await ContentService.getContentForPublicProfile(username, viewerId);
    ok(res, content);
});

export const getContentById = asyncHandler(async (req: Request, res: Response) => {
    const fanId = requireAuth(req);
    const { id: contentId } = req.params;
    const content = await ContentService.getContentForFan(contentId, fanId);
    ok(res, content);
});

export const updateContent = asyncHandler(async (req: Request, res: Response) => {
    const creator_id = requireAuth(req);
    const { id: contentId } = req.params;
    const updates = req.body;

    if (updates.scheduleIsScheduled !== undefined) {
        updates.schedule = {
            isScheduled: updates.scheduleIsScheduled,
            publishDate: updates.schedulePublishDate,
        };
        delete updates.scheduleIsScheduled;
        delete updates.schedulePublishDate;
    }

    if (updates.visibility === undefined || updates.visibility === null || updates.visibility === '') {
        updates.visibility = 'subscribers_only';
    }

    if (updates.minTierLevel !== undefined) {
        updates.min_tier_level = updates.minTierLevel;
        delete updates.minTierLevel;
    }

    const updatedContent = await ContentService.updateCreatorContent(contentId, creator_id, updates);
    ok(res, updatedContent);
});

export const deleteContent = asyncHandler(async (req: Request, res: Response) => {
    const creator_id = requireAuth(req);
    const { id: contentId } = req.params;
    const deletedContent = await ContentService.deleteCreatorContent(contentId, creator_id);
    ok(res, deletedContent);
});

export const getSecureContentUrl = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const { id: contentId } = req.params;
    if (!contentId) {
        throw new AppError('Content ID is missing from request parameters.', 400);
    }

    const { secureUrl } = await ContentService.getSecureUrlForThumbnail(contentId, userId);
    ok(res, { secureUrl });
});

export const getContentView = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const { id: contentId } = req.params;
    const result = await ContentService.getSecureUrlForViewing(contentId, userId);
    ok(res, result);
});

export const getContentViewerData = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id: contentId } = req.params;
    const data = await ContentService.getViewData(contentId, userId);
    ok(res, data);
});

export const reportContent = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const { id: contentId } = req.params;
    const { reason, details } = req.body;

    if (!reason) {
        throw new AppError('Reason is required.', 400);
    }

    await ContentService.reportContent(userId, contentId, reason, details);
    okMsg(res, 'Content reported successfully.');
});
