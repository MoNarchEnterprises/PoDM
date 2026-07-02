import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';
import * as UserService from '../services/user.service';
import * as AnalyticsService from '../services/analytics.service';
import * as ContentModel from '../models/content.model';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../utils/requestHelpers';
import { ok, okMsg } from '../utils/response';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
        throw new AppError('Authentication error, user not found in request.', 401);
    }
    ok(res, user);
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const updatedUser = await UserService.updateUserProfile(userId, req.body);
    ok(res, updatedUser);
});

export const updateMyAvatar = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const file = req.file;
    if (!file) {
        throw new AppError('No file uploaded.', 400);
    }
    const updatedUser = await UserService.uploadUserAvatar(userId, file);
    ok(res, updatedUser);
});

export const addToGallery = asyncHandler(async (req: Request, res: Response) => {
    const fanId = requireAuth(req);
    const { contentId } = req.body;
    if (!contentId) {
        throw new AppError('Content ID is required to add an item to the gallery.', 400);
    }

    const updatedGallery = await UserService.addToUserGallery(fanId, contentId);

    try {
        const content = await ContentModel.findContentById(contentId);
        if (content && content.creator_id) {
            await AnalyticsService.logAnalyticsEvent({
                eventType: 'gallery_add',
                creatorId: content.creator_id,
                viewerId: fanId,
                contentId: contentId,
            });
        }
    } catch (analyticsError) {
        console.error('[User Controller] Failed to log gallery_add analytics event:', analyticsError);
    }

    ok(res, updatedGallery);
});

export const removeFromGallery = asyncHandler(async (req: Request, res: Response) => {
    const fanId = requireAuth(req);
    const { contentId } = req.params;
    const updatedGallery = await UserService.removeFromUserGallery(fanId, contentId);
    ok(res, updatedGallery);
});

export const getPublicProfile = asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.params;
    const userProfile = await UserService.getPublicUserProfile(username);
    ok(res, userProfile);
});

export const completeOnboarding = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const updatedUser = await UserService.onboardCreator(userId, req.body);
    ok(res, updatedUser);
});

export const submitVerification = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const { signature } = req.body;
    const result = await UserService.submitVerificationDocs(userId, files, signature);
    res.status(200).json(result);
});

export const getFullPublicProfile = asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.params;
    const viewerId = req.user?.id;
    const profileData = await UserService.getFullPublicProfile(username, viewerId);
    ok(res, profileData);
});

export const getMyFeed = asyncHandler(async (req: Request, res: Response) => {
    const fanId = requireAuth(req);
    const page = parseInt(req.query.page as string) || 1;
    const feed = await UserService.generateFanFeed(fanId, page);
    ok(res, feed);
});

export const getMyGallery = asyncHandler(async (req: Request, res: Response) => {
    const fanId = requireAuth(req);
    const galleryData = await UserService.getFanGallery(fanId);
    ok(res, galleryData);
});

export const getMySettings = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const settings = await UserService.getFanSettings(userId);
    ok(res, settings);
});

export const updateMySettings = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const updatedSettings = await UserService.updateFanSettings(userId, req.body);
    ok(res, updatedSettings);
});

export const updateMyPaymentMethod = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const { paymentMethodId } = req.body;
    if (!paymentMethodId) {
        throw new AppError('A paymentMethodId is required.', 400);
    }
    const result = await UserService.updateFanPaymentMethod(userId, paymentMethodId);
    ok(res, result);
});

export const createSetupIntent = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const result = await UserService.createSetupIntent(userId);
    ok(res, result);
});
