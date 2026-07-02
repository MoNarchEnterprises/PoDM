import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';
import * as NotificationService from '../services/notification.service';
import * as NotificationModel from '../models/notification.model';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../utils/requestHelpers';
import { ok, okMsg } from '../utils/response';

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const limit = parseInt(req.query.limit as string) || 20;
    const notifications = await NotificationService.getEnrichedNotifications(userId, limit);
    ok(res, notifications);
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    const count = await NotificationModel.getUnreadCount(userId);
    ok(res, { count });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await NotificationModel.markAsRead(id);
    okMsg(res, 'Notification marked as read');
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuth(req);
    await NotificationModel.markAllAsRead(userId);
    okMsg(res, 'All notifications marked as read');
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await NotificationModel.deleteNotification(id);
    okMsg(res, 'Notification deleted');
});
