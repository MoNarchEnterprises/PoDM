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
