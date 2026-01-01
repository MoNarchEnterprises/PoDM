import * as NotificationModel from '../models/notification.model';
import * as SubscriptionModel from '../models/subscription.model';
import * as UserModel from '../models/user.model';
import * as ContentModel from '../models/content.model';
import { NotificationWithCreator } from '@common/types/Notification';
import { generateSignedUrlsForContent } from '../utils/content.utils';
import supabase from '../config/supabaseClient';

/**
 * Create notifications for all subscribers when a creator posts new content
 */
export const notifySubscribersOfNewContent = async (creatorId: string, contentId: number): Promise<void> => {
    // Get all subscriptions for this creator
    const subscriptions = await SubscriptionModel.findSubscriptionsByCreator(creatorId);

    if (!subscriptions || subscriptions.length === 0) {
        return; // No subscribers to notify
    }

    // Filter for active subscriptions only
    const activeSubscriptions = subscriptions.filter((sub: any) => sub.status === 'active');

    if (activeSubscriptions.length === 0) {
        return;
    }

    // Get creator info
    const creator = await UserModel.findUserById(creatorId);
    if (!creator) return;

    // Get content info
    const content = await ContentModel.findContentById(contentId.toString());
    if (!content) return;

    // Create notification for each subscriber (only if they have notifications enabled)
    const notificationPromises = [];

    for (const sub of activeSubscriptions) {
        // Fetch fan's preferences to check if they have notifications enabled
        const { data: fanProfile } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('id', sub.fan_id)
            .single();

        // Check if fan has new content notifications enabled (default to true if not set)
        const hasNotificationsEnabled = fanProfile?.preferences?.notifications?.newContent !== false;

        if (hasNotificationsEnabled) {
            notificationPromises.push(
                NotificationModel.createNotification({
                    user_id: sub.fan_id,
                    type: 'new_content' as const,
                    title: `${creator.username} posted new content`,
                    message: content.title,
                    related_content_id: contentId,
                    related_user_id: creatorId,
                    is_read: false
                })
            );
        }
    }

    // Batch create notifications
    await Promise.all(notificationPromises);
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
            const content = await ContentModel.findContentById(notif.related_content_id.toString());
            if (content && content.files && content.files.length > 0) {
                // Generate signed URLs for thumbnails
                const contentWithUrls = await generateSignedUrlsForContent(content);

                enriched.content = {
                    id: Number(content.id),
                    title: content.title,
                    type: content.type,
                    thumbnailUrl: contentWithUrls.files[0].thumbnailUrl
                };
            }
        }

        return enriched;
    }));
};
