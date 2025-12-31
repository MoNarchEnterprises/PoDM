import { Request, Response } from 'express';
import * as NotificationService from '../services/notification.service';
import * as NotificationModel from '../models/notification.model';

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const limit = parseInt(req.query.limit as string) || 20;

        const notifications = await NotificationService.getEnrichedNotifications(userId, limit);

        res.json({ success: true, data: notifications });
    } catch (error: any) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const count = await NotificationModel.getUnreadCount(userId);

        res.json({ success: true, data: { count } });
    } catch (error: any) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await NotificationModel.markAsRead(id);

        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error: any) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        await NotificationModel.markAllAsRead(userId);

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error: any) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await NotificationModel.deleteNotification(id);

        res.json({ success: true, message: 'Notification deleted' });
    } catch (error: any) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
