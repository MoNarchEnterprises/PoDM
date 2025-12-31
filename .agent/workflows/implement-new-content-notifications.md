---
description: Implementation plan for New Content notifications system
---

# New Content Notifications Implementation Plan

## Overview
Implement a notification system that alerts fans when creators they're subscribed to post new content. This includes database schema, backend API, frontend UI, and real-time updates.

**Status**: Phase 1 ✅ COMPLETE | Phase 2 ✅ COMPLETE | Phase 3 🔄 IN PROGRESS

---

## Phase 1: Database Schema ✅ COMPLETE

### 1.1 Create Notifications Table ✅ COMPLETE
**File**: Supabase schema (completed by user)

**Actual Schema** (uses `profiles` instead of `users`):
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'new_content', 'new_message', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT,
    related_content_id INTEGER REFERENCES content(id) ON DELETE CASCADE,
    related_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
```

### 1.2 Update User Settings Schema
Ensure the `users` table or `user_settings` has a field for notification preferences:
```sql
-- If using JSONB for settings
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"newContent": true}'::jsonb;

-- Or if you have a separate settings table
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS new_content_notifications BOOLEAN DEFAULT TRUE;
```

---

## Phase 2: Backend Implementation ✅ COMPLETE

**Completed Files:**
- ✅ `common/types/Notification.ts` - Type definitions
- ✅ `server/models/notification.model.ts` - Database operations
- ✅ `server/services/notification.service.ts` - Business logic
- ✅ `server/controllers/notification.controller.ts` - API handlers
- ✅ `server/routes/notification.routes.ts` - Express routes
- ✅ `server/Server.ts` - Routes registered

**API Endpoints Available:**
- `GET /api/v1/notifications` - Get user's notifications
- `GET /api/v1/notifications/unread-count` - Get unread count
- `PUT /api/v1/notifications/:id/read` - Mark notification as read
- `PUT /api/v1/notifications/read-all` - Mark all as read
- `DELETE /api/v1/notifications/:id` - Delete notification

### 2.1 Create Notification Type ✅ COMPLETE
**File**: `common/types/Notification.ts`

```typescript
export interface Notification {
    id: string;
    user_id: string;
    type: 'new_content' | 'new_message' | 'subscription_renewal';
    title: string;
    message?: string;
    related_content_id?: number;
    related_user_id?: string;
    is_read: boolean;
    created_at: string;
    updated_at: string;
}

export interface NotificationWithCreator extends Notification {
    creator?: {
        id: string;
        username: string;
        profile: {
            name: string;
            avatar: string;
        };
    };
    content?: {
        id: number;
        title: string;
        type: string;
        thumbnailUrl: string;
    };
}
```

### 2.2 Create Notification Model
**File**: `server/models/notification.model.ts`

```typescript
import supabase from '../config/supabaseClient';
import { Notification } from '@common/types/Notification';

export const createNotification = async (notificationData: Omit<Notification, 'id' | 'created_at' | 'updated_at'>): Promise<Notification> => {
    const { data, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const getNotificationsForUser = async (userId: string, limit: number = 20): Promise<Notification[]> => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (error) throw error;
    return data || [];
};

export const getUnreadCount = async (userId: string): Promise<number> => {
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    
    if (error) throw error;
    return count || 0;
};

export const markAsRead = async (notificationId: string): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);
    
    if (error) throw error;
};

export const markAllAsRead = async (userId: string): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);
    
    if (error) throw error;
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
    
    if (error) throw error;
};
```

### 2.3 Create Notification Service
**File**: `server/services/notification.service.ts`

```typescript
import * as NotificationModel from '../models/notification.model';
import * as SubscriptionModel from '../models/subscription.model';
import * as UserModel from '../models/user.model';
import * as ContentModel from '../models/content.model';
import { NotificationWithCreator } from '@common/types/Notification';

/**
 * Create notifications for all subscribers when a creator posts new content
 */
export const notifySubscribersOfNewContent = async (creatorId: string, contentId: number): Promise<void> => {
    // Get all active subscribers for this creator
    const activeSubscriptions = await SubscriptionModel.findActiveSubscriptionsByCreator(creatorId);
    
    if (!activeSubscriptions || activeSubscriptions.length === 0) {
        return; // No subscribers to notify
    }

    // Get creator info
    const creator = await UserModel.findUserById(creatorId);
    if (!creator) return;

    // Get content info
    const content = await ContentModel.findContentById(contentId);
    if (!content) return;

    // Create notification for each subscriber
    const notifications = activeSubscriptions.map(sub => ({
        user_id: sub.fan_id,
        type: 'new_content' as const,
        title: `${creator.profile.name} posted new content`,
        message: content.title,
        related_content_id: contentId,
        related_user_id: creatorId,
        is_read: false
    }));

    // Batch create notifications
    await Promise.all(notifications.map(notif => NotificationModel.createNotification(notif)));
};

/**
 * Get enriched notifications for a user (with creator and content details)
 */
export const getEnrichedNotifications = async (userId: string, limit: number = 20): Promise<NotificationWithCreator[]> => {
    const notifications = await NotificationModel.getNotificationsForUser(userId, limit);
    
    // Enrich with creator and content data
    return Promise.all(notifications.map(async (notif) => {
        const enriched: NotificationWithCreator = { ...notif };
        
        // Add creator info if available
        if (notif.related_user_id) {
            const creator = await UserModel.findUserById(notif.related_user_id);
            if (creator) {
                enriched.creator = {
                    id: creator.id,
                    username: creator.username,
                    profile: {
                        name: creator.profile.name,
                        avatar: creator.profile.avatar
                    }
                };
            }
        }
        
        // Add content info if available
        if (notif.related_content_id) {
            const content = await ContentModel.findContentById(notif.related_content_id);
            if (content && content.files && content.files.length > 0) {
                enriched.content = {
                    id: content.id,
                    title: content.title,
                    type: content.type,
                    thumbnailUrl: content.files[0].thumbnailUrl
                };
            }
        }
        
        return enriched;
    }));
};
```

### 2.4 Update Content Service
**File**: `server/services/content.service.ts`

Add notification trigger when content is created:

```typescript
// In createContent function, after content is successfully created:
import * as NotificationService from './notification.service';

// After content creation
const newContent = await ContentModel.createContent(contentData);

// Trigger notifications for subscribers (async, don't wait)
NotificationService.notifySubscribersOfNewContent(creator_id, newContent.id)
    .catch(err => console.error('Failed to send notifications:', err));

return newContent;
```

### 2.5 Create Notification Routes
**File**: `server/routes/notification.routes.ts`

```typescript
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
```

### 2.6 Create Notification Controller
**File**: `server/controllers/notification.controller.ts`

```typescript
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
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const count = await NotificationModel.getUnreadCount(userId);
        
        res.json({ success: true, data: { count } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await NotificationModel.markAsRead(id);
        
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        await NotificationModel.markAllAsRead(userId);
        
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await NotificationModel.deleteNotification(id);
        
        res.json({ success: true, message: 'Notification deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
```

### 2.7 Register Routes
**File**: `server/Server.ts`

```typescript
import notificationRoutes from './routes/notification.routes';

// Add to routes
app.use('/api/v1/notifications', notificationRoutes);
```

---

## Phase 3: Frontend Implementation

### 3.1 Add API Client Methods
**File**: `podm-frontend/src/lib/apiClient.ts`

```typescript
// Notification endpoints
export const getNotifications = (limit?: number) => 
    api.get(`/notifications${limit ? `?limit=${limit}` : ''}`);

export const getUnreadNotificationCount = () => 
    api.get('/notifications/unread-count');

export const markNotificationAsRead = (notificationId: string) => 
    api.put(`/notifications/${notificationId}/read`);

export const markAllNotificationsAsRead = () => 
    api.put('/notifications/read-all');

export const deleteNotification = (notificationId: string) => 
    api.delete(`/notifications/${notificationId}`);
```

### 3.2 Create Notification Bell Component
**File**: `podm-frontend/src/components/shared/NotificationBell.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import * as apiClient from '../../lib/apiClient';

const NotificationBell = () => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetchUnreadCount();
        // Poll for updates every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const response = await apiClient.getUnreadNotificationCount();
            setUnreadCount(response.data.data.count);
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    };

    return (
        <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </button>
    );
};

export default NotificationBell;
```

### 3.3 Create Notifications Panel
**File**: `podm-frontend/src/components/shared/NotificationsPanel.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { X, Check, Trash2 } from 'lucide-react';
import * as apiClient from '../../lib/apiClient';
import { NotificationWithCreator } from '@common/types/Notification';
import { useNavigate } from 'react-router-dom';

interface NotificationsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const NotificationsPanel = ({ isOpen, onClose }: NotificationsPanelProps) => {
    const [notifications, setNotifications] = useState<NotificationWithCreator[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await apiClient.getNotifications(20);
            setNotifications(response.data.data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationClick = async (notification: NotificationWithCreator) => {
        // Mark as read
        if (!notification.is_read) {
            await apiClient.markNotificationAsRead(notification.id);
        }
        
        // Navigate to content
        if (notification.related_content_id) {
            navigate(`/content/${notification.related_content_id}`);
            onClose();
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await apiClient.markAllNotificationsAsRead();
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await apiClient.deleteNotification(notificationId);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold">Notifications</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleMarkAllRead}
                        className="text-sm text-purple-600 hover:text-purple-700"
                    >
                        <Check className="w-5 h-5" />
                    </button>
                    <button onClick={onClose}>
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No notifications</div>
                ) : (
                    notifications.map(notification => (
                        <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                !notification.is_read ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                {notification.creator && (
                                    <img
                                        src={notification.creator.profile.avatar}
                                        alt={notification.creator.profile.name}
                                        className="w-10 h-10 rounded-full"
                                    />
                                )}
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{notification.title}</p>
                                    {notification.message && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            {notification.message}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(notification.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => handleDelete(notification.id, e)}
                                    className="text-gray-400 hover:text-red-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationsPanel;
```

### 3.4 Add to Header
**File**: `podm-frontend/src/components/layout/Header.tsx`

```typescript
import NotificationBell from '../shared/NotificationBell';

// Add to header navigation, next to other icons
<NotificationBell />
```

---

## Phase 4: Real-Time Updates (Optional Enhancement)

### 4.1 Socket.IO Event for New Notifications
**File**: `server/Server.ts`

```typescript
// When creating a notification, emit to the user's socket
io.to(`user:${userId}`).emit('new-notification', notification);
```

### 4.2 Frontend Socket Listener
**File**: `podm-frontend/src/components/shared/NotificationBell.tsx`

```typescript
import { useSocket } from '../../hooks/useSocket';

const socket = useSocket();

useEffect(() => {
    socket?.on('new-notification', (notification) => {
        setUnreadCount(prev => prev + 1);
        // Optionally show a toast notification
    });

    return () => {
        socket?.off('new-notification');
    };
}, [socket]);
```

---

## Phase 5: Testing Checklist

- [ ] Database table created successfully
- [ ] Notifications are created when creator posts content
- [ ] Only subscribers receive notifications
- [ ] Notification count updates in header
- [ ] Clicking notification navigates to content
- [ ] Mark as read functionality works
- [ ] Mark all as read functionality works
- [ ] Delete notification works
- [ ] Unread notifications are visually distinct
- [ ] Real-time updates work (if implemented)
- [ ] Notification preferences in settings work

---

## Future Enhancements

1. **Email Notifications**: Send email digest of unread notifications
2. **Push Notifications**: Browser push notifications for real-time alerts
3. **Notification Types**: Add more types (new message, subscription renewal, etc.)
4. **Notification Grouping**: Group multiple notifications from same creator
5. **Notification Preferences**: Per-creator notification settings
6. **Notification History**: Archive and search old notifications

---

## Estimated Timeline

- **Phase 1 (Database)**: 30 minutes
- **Phase 2 (Backend)**: 2-3 hours
- **Phase 3 (Frontend)**: 2-3 hours
- **Phase 4 (Real-time)**: 1 hour
- **Phase 5 (Testing)**: 1-2 hours

**Total**: 6-9 hours

---

## Notes

- Start with Phase 1 and 2 to get the backend working
- Test backend endpoints with Postman/Thunder Client before building frontend
- Phase 4 (real-time) is optional but highly recommended for better UX
- Consider notification retention policy (auto-delete after 30 days?)
