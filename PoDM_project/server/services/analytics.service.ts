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

    if (viewerId) {
        const viewer = await UserModel.findUserById(viewerId);
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

    // If the event is a post view, increment the view count on the content table
    if (eventType === 'post_view' && contentId) {
        const { error: rpcError } = await supabase.rpc('increment_content_view_count', { content_id_to_update: contentId });
        if (rpcError) {
            console.error('Error incrementing content view count:', rpcError);
            // Don't throw an error here, as the main event has been logged
        }
    }

    return { success: true, message: 'Event logged.' };
};

/**
 * Counts analytics events for a specific creator.
 * @param creatorId - The ID of the creator.
 * @param eventType - The type of event to count ('profile_visit' or 'post_view').
 * @param days - The number of days to look back.
 * @returns The total count of the specified event.
 */
export const countEventsForCreator = async (creatorId: string, eventType: 'profile_visit' | 'post_view', days?: number) => {
    let query = supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorId)
        .eq('event_type', eventType);

    if (days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        query = query.gte('created_at', date.toISOString());
    }

    const { count, error } = await query;

    if (error) {
        console.error(`Error counting ${eventType} for creator ${creatorId}:`, error.message);
        return 0;
    }
    return count || 0;
};