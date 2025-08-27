import supabase from '../config/supabaseClient';
import { AppError } from '../middleware/error.middleware';
// 1. Import the user model to check the viewer's role
import * as UserModel from '../models/user.model';

interface AnalyticsEvent {
    eventType: 'profile_visit' | 'post_view';
    creatorId: string;
    viewerId: string | null;
    contentId?: string;
}

export const logAnalyticsEvent = async (event: AnalyticsEvent) => {
    const { eventType, creatorId, viewerId, contentId } = event;

    // 2. Check if there is a logged-in viewer before proceeding
    if (viewerId) {
        const viewer = await UserModel.findUserById(viewerId);
        // 3. Prevent logging if the viewer is an admin OR if it's a self-view
        if (viewer && (viewer.role === 'admin' || viewer.id === creatorId)) {
            return { success: true, message: 'Admin or self-view not logged.' };
        }
    }

    const { error } = await supabase.from('analytics_events').insert({
        event_type: eventType,
        creator_id: creatorId,
        viewer_id: viewerId,
        content_id: contentId,
    });

    if (error) {
        console.error('Error logging analytics event:', error);
        throw new AppError('Could not log event.', 500);
    }

    return { success: true, message: 'Event logged.' };
};