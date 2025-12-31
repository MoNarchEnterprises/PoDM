import express from 'express';
import * as NotificationController from '../controllers/notification.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/v1/notifications - Get user's notifications
router.get('/', NotificationController.getNotifications);

// GET /api/v1/notifications/unread-count - Get unread count
router.get('/unread-count', NotificationController.getUnreadCount);

// PUT /api/v1/notifications/:id/read - Mark notification as read
router.put('/:id/read', NotificationController.markAsRead);

// PUT /api/v1/notifications/read-all - Mark all as read
router.put('/read-all', NotificationController.markAllAsRead);

// DELETE /api/v1/notifications/:id - Delete notification
router.delete('/:id', NotificationController.deleteNotification);

export default router;
