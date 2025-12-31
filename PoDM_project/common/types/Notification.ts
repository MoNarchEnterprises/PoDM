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
