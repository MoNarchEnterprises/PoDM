import axios from 'axios';
import { User, UserRole, UserProfile } from '@common/types/User';

// --- Configuration ---
interface GetContentParams {
    type?: string;
    searchTerm?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
}

/**
 * The base URL for all API requests.
 * In a real application, this would come from an environment variable.
 * e.g., process.env.REACT_APP_API_URL
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const getAuthToken = (): string | null => {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
};

export const getImpersonatingUserId = (): string | null => {
    return localStorage.getItem('impersonating_user_id') || sessionStorage.getItem('impersonating_user_id');
};

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Interceptors ---

/**
 * Request Interceptor:
 * Runs before every request is sent.
 * Attaches credentials/cookies automatically, plus Authorization header fallback if token is present in storage.
 */
apiClient.interceptors.request.use(
    (config) => {
        const token = getAuthToken();
        const impersonatingUserId = getImpersonatingUserId();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (impersonatingUserId) {
            console.log('[apiClient] Sending X-Impersonating-User-Id:', impersonatingUserId);
            config.headers['X-Impersonating-User-Id'] = impersonatingUserId;
        }

        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// --- Error Handler Registration ---

// Error handler callback type
type ErrorHandlerCallback = (message: string, type: 'success' | 'error' | 'info') => void;

// Store the error handler callback
let errorHandlerCallback: ErrorHandlerCallback | null = null;

/**
 * Register an error handler to be called when API errors occur.
 * This allows components like ToastContext to display error messages to users.
 * @param handler - The callback function to handle errors.
 */
export const registerErrorHandler = (handler: ErrorHandlerCallback) => {
    errorHandlerCallback = handler;
};

/**
 * Response Interceptor:
 * This function runs after every single response is received.
 * It's the perfect place to handle global API errors.
 */
apiClient.interceptors.response.use(
    (response) => {
        // If the response is successful (status 2xx), just return it.
        return response;
    },
    (error) => {
        // Determine the error message
        let errorMessage = 'An unexpected error occurred';

        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            errorMessage = error.response.data?.message || error.response.data?.error || errorMessage;

            if (error.response?.status === 401) {
                // Check if the request explicitly asked to skip auth redirect
                // We cast config to any because 'skipAuthRedirect' is a custom property
                if ((error.config as any)?.skipAuthRedirect) {
                    return Promise.reject(error);
                }

                // Handle unauthorized errors, e.g., redirect to login
                console.error("Unauthorized request. Redirecting to login.");
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('authToken');
                errorMessage = "Your session has expired. Please log in again.";

                // Call the registered error handler if it exists
                if (errorHandlerCallback) {
                    errorHandlerCallback(errorMessage, 'error');
                }

                // Delay redirect to allow toast to show
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);

                return Promise.reject(error);
            }
        } else if (error.request) {
            // The request was made but no response was received
            errorMessage = 'No response from server. Please check your connection.';
        } else {
            // Something happened in setting up the request that triggered an Error
            errorMessage = error.message || errorMessage;
        }

        // Call the registered error handler if it exists
        if (errorHandlerCallback) {
            errorHandlerCallback(errorMessage, 'error');
        }

        return Promise.reject(error);
    }
);

// --- API Service Functions ---

type ApiMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

export const api = async <T = any>(method: ApiMethod, url: string, data?: any, config?: any): Promise<T> => {
    const response = await (apiClient[method] as Function)(url, data, config);
    return response.data;
};

interface AuthResponse {
    success: boolean;
    message: string;
    data: {
        user: User;
        token: string;
    };
}



/**
 * Sends a signup request to the backend.
 */
export const signup = async (username: string, email: string, password: string, role: UserRole) => {
    console.log("API Client: Signing up user with role:", role);
    const response = await apiClient.post<AuthResponse>('/auth/signup', {
        username,
        email,
        password,
        role,
    });
    return response.data;
};

/**
 * Sends a login request to the backend.
 */
export const login = (email: string, password: string) =>
    api<AuthResponse>('post', '/auth/login', { email, password });

/**
 * Sends a request to the backend to initiate the password reset process.
 * @param email - The user's email address.
 */
export const forgotPassword = (email: string) =>
    api('post', '/auth/forgot-password', { email });

/**
 * Verifies the user's session and retrieves their data.
 * This is typically called on app load to check if the user is logged in.
 */
export const getMe = () =>
    api<AuthResponse>('get', '/auth/me');

/**
 * Sends a request to update the current user's profile information.
 * It intelligently filters out any empty fields before sending the request.
 * @param profileData - The profile data to update (e.g., name, email).
 */
export const updateMe = async (profileData: Record<string, any>) => {
    const payload: Record<string, any> = {};
    // Iterate over the keys in the provided data and build a payload
    // that only includes fields with actual values (not empty strings).
    for (const key in profileData) {
        if (Object.prototype.hasOwnProperty.call(profileData, key) && profileData[key] !== '') {
            payload[key] = profileData[key];
        }
    }

    // Only send the filtered payload to the backend.
    const response = await apiClient.put<{ success: boolean, data: User }>('/users/me', payload);
    return response.data;
};

/**
 * Updates the settings for the currently logged-in creator.
 * @param settingsData - The full settings object from the settings page.
 */
export const updateCreatorSettings = async (settingsData: any, bannerFile?: File | null) => {
    const formData = new FormData();

    // Append text data as JSON strings. The backend will parse them.
    formData.append('profile', JSON.stringify(settingsData.profile));
    formData.append('creatorData', JSON.stringify(settingsData.creatorData));

    // Append the file if it exists
    if (bannerFile) {
        formData.append('banner', bannerFile);
    }

    const response = await apiClient.put('/creator/settings', formData);
    return response.data;
};

/**
 * Signup and subscribe a new fan in one step.
 * @param data - The signup and subscription data from the frontend.
 */
export const signupAndSubscribe = (data: any) =>
    api('post', '/auth/signup-and-subscribe', data);



/**
 * Sends a request to update the current user's avatar.
 * @param avatarFile - The avatar file to upload.
 */
export const uploadAvatar = async (avatarFile: File) => {
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    const response = await apiClient.post('/users/me/avatar', formData);

    return response.data;
};

/**
 * Sends a request to change the current user's password.
 * @param currentPassword - The user's current password.
 * @param newPassword - The new password to set.
 */
export const changePassword = (data: { currentPassword: string, newPassword: string }) =>
    api('post', '/auth/change-password', data);

/**
 * Gets the current platform settings.
 */
export const getPlatformSettings = () =>
    api('get', '/admin/settings/platform');

/**
 * Sends a request to update the platform settings.
 * @param settings - The settings object to update.
 */
export const updatePlatformSettings = (settings: { commissionRate?: number; aiProvider?: string; aiModelId?: string }) =>
    api('put', '/admin/settings/platform', settings);

/**
 * Sends a request to update a user's status (e.g., active, suspended, banned).
 * @param userId - The ID of the user to update.
 * @param status - The new status to set.
 */
export const updateUserStatus = (userId: string, status: string) =>
    api<{ success: boolean, data: User }>('put', `/admin/users/${userId}/status`, { status });

/**
 * Sends a request to update a creator's custom commission rate.
 * @param creatorId - The ID of the creator to update.
 * @param commissionRate - The new rate to set (or null to reset to default).
 */
export const updateCreatorCommission = (creatorId: string, commissionRate: number | null) =>
    api<{ success: boolean, data: User }>('put', `/admin/users/${creatorId}/commission`, { commissionRate });

/**
 * Sends a request to complete the creator onboarding process.
 * @param onboardingData - The data from the onboarding form.
 */
export const completeCreatorOnboarding = (onboardingData: any) =>
    api<{ success: boolean, data: User }>('post', '/users/me/onboarding', onboardingData);

/**
 * Submits creator verification documents.
 * @param formData The FormData object containing files and signature.
 */
export const submitVerification = (formData: FormData) =>
    api('post', '/users/me/verification', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

/**
 * Gets the secure, temporary URLs for a creator's verification documents.
 * @param userId The ID of the user whose documents are needed.
 */
export const getVerificationDocs = (userId: string) =>
    api('get', `/admin/users/${userId}/verification-docs`);

/**
 * Gets all the necessary data for the creator dashboard.
 */
export const getCreatorDashboardData = () =>
    api('get', '/creator/dashboard');

/**
 * Gets all the necessary data for the creator analytics page.
 */
export const getCreatorAnalyticsData = () =>
    api('get', '/creator/analytics');

/**
 * Exports the creator analytics metrics as a CSV string.
 */
export const exportCreatorMetricsCSV = () =>
    api('get', '/creator/metrics/export?format=csv', null, { responseType: 'text' });

/**
 * Exports the fan engagement metrics as a CSV string.
 */
export const exportCreatorFanEngagementCSV = () =>
    api('get', '/creator/metrics/export-fans?format=csv', null, { responseType: 'text' });

/**
 * Logs an analytics event like a profile or post view.
 */
export const logAnalyticsEvent = async (data: {
    eventType: 'profile_visit' | 'post_view';
    creatorId: string;
    contentId?: string;
}) => {
    // We use a try/catch here because we don't want analytics
    // failures to block the user experience.
    try {
        await apiClient.post('/analytics/log', data, { skipAuthRedirect: true } as any);
    } catch (error) {
        console.warn('Analytics event failed to log:', error);
    }
};

/**
 * Gets all content for the currently logged-in creator, with filtering and sorting.
 */
export const getMyCreatorContent = async (params: GetContentParams = {}) => {
    // Use URLSearchParams to easily build the query string
    const query = new URLSearchParams();
    if (params.type && params.type !== 'All') query.append('type', params.type);
    if (params.searchTerm) query.append('searchTerm', params.searchTerm);
    if (params.sortKey) query.append('sortKey', params.sortKey);
    if (params.sortDirection) query.append('sortDirection', params.sortDirection);

    const response = await apiClient.get(`/content/my-content?${query.toString()}`);
    return response.data;
};

/**
 * Creates a new piece of content by uploading files and metadata.
 * @param formData The FormData object containing files and content data.
 */
export const createContent = async (formData: FormData) => {
    const response = await apiClient.post('/content', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

/**
 * Sends a request to delete a piece of content.
 * @param contentId The ID of the content to delete.
 */
export const deleteContent = (contentId: string) =>
    api('delete', `/content/${contentId}`);

interface UpdateContentPayload {
    title: string;
    description: string;
    visibility: 'subscribers_only' | 'pay_per_view';
    price?: number; // Price in cents
    minTierLevel?: number; // Minimum tier level required (1-10)
    scheduleIsScheduled: boolean;
    schedulePublishDate?: string; // ISO String
}

/**
 * Sends a request to update a piece of content's metadata.
 * @param contentId The ID of the content to update.
 * @param updates The data to update.
 */
export const updateContent = async (contentId: string, updates: UpdateContentPayload) => {
    // We send a JSON object now, not FormData
    const response = await apiClient.put(`/content/${contentId}`, updates);
    return response.data;
};

/**
 * Fetches all data needed for a creator's public profile page.
 * @param username The username of the creator.
 */
export const getPublicCreatorProfile = (username: string) =>
    api('get', `/users/profile/${username}`);

/**
 * Gets all the necessary data for the creator earnings page.
 */
export const getCreatorEarningsData = () =>
    api('get', '/creator/earnings');



/**
 * Submits a payout request for the currently logged-in creator.
 * @param amount - The amount in dollars to withdraw.
 */
export const requestCreatorPayout = (amount: number) =>
    api('post', '/creator/payouts', { amount });

/**
 * Gets a secure, temporary URL for a piece of content.
 * @param contentId The ID of the content.
 */
export const getSecureContentUrl = (contentId: string) =>
    api('get', `/content/${contentId}/secure-url`);

/**
 * Gets a secure, temporary URL for viewing a full-size piece of content.
 * @param contentId The ID of the content to view.
 */
export const getSecureContentViewUrl = (contentId: string) =>
    api('get', `/content/${contentId}/view`);

/**
 * Fetches all conversations for the current user.
 */
export const getMyConversations = () =>
    api('get', '/messages/conversations');

/**
 * Fetches vault content attachable to a specific fan (excludes items already in fan's gallery).
 * @param fanId - The ID of the target fan.
 */
export const getAttachableVaultContent = (fanId: string) =>
    api<Content[]>('get', `/messages/fans/${fanId}/attachable-content`);

/**
 * Fetches all messages for a specific conversation.
 * @param conversationId - The ID of the conversation.
 */
export const getMessagesInConversation = (conversationId: string) =>
    api('get', `/messages/conversations/${conversationId}`);



/**
 * Notifies the backend that a conversation's messages have been read.
 * @param conversationId - The ID of the conversation.
 */
export const markConversationAsRead = (conversationId: string) =>
    api('put', `/messages/conversations/${conversationId}/read`);

/**
 * Sends a new direct message.
 * @param receiverId - The ID of the user to send the message to.
 * @param text - The text content of the message.
 * @param content - Optional: The content payload for PPV attachments.
 */
export const sendMessage = async (receiverId: string, text: string, content?: any) => {
    // The payload now includes all three potential properties.
    // If 'content' is undefined, it will be omitted from the JSON payload.
    const response = await apiClient.post('/messages', { receiverId, text, content });
    return response.data;
};

/**
 * Sends a request to delete a specific message.
 * @param messageId - The ID of the message to delete.
 */
export const deleteMessage = (messageId: string) =>
    api('delete', `/messages/${messageId}`);

/**
 * Sends a voice message to a fan.
 * @param formData - FormData containing the voice message audio file and receiverId.
 */
export const sendVoiceMessage = async (formData: FormData) => {
    const response = await apiClient.post('/messages/voice', formData);
    return response.data;
};

/**
 * Unlocks PPV content in a message.
 * @param messageId - The ID of the message to unlock.
 */
export const unlockMessageContent = (messageId: string) =>
    api('patch', `/messages/${messageId}/unlock`);

/**
 * Fetches the personalized content feed for the logged-in fan.
 * @param page The page number to fetch for infinite scrolling.
 */
export const getFanFeed = (page: number = 1) =>
    api('get', `/users/me/feed?page=${page}`);

/**
 * Fetches all subscriptions for the currently logged-in fan.
 */
export const getFanSubscriptions = () =>
    api('get', '/subscriptions');

/**
 * Creates a new subscription for a creator tier.
 */
export const createSubscription = (creator_id: string, tier_id: string, paymentMethodId: string) =>
    api('post', '/subscriptions', { creator_id, tier_id, paymentMethodId, txHash: paymentMethodId });

/**
 * Sends a tip to a creator.
 */
export const sendTip = (creatorId: string, amountInCents: number, message?: string, relatedId?: string, txHash?: string) =>
    api('post', '/payments/crypto/verify', {
        txHash: txHash || '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join(''),
        creatorId,
        amountInCents,
        transactionType: 'Tip',
        relatedId,
    });

/**
 * Resolves the referrer details (wallet address + referral fee bps) a fan must
 * pass to the PoDM contract when paying a creator. referrerAddress is '' when
 * the creator has no active percentage referral.
 */
export const getPaymentReferrerInfo = (creatorId: string) =>
    api<{ success: boolean; data: { referrerAddress: string; referralFeeBps: number; platformFeeBps: number } }>('get', `/payments/crypto/referrer/${creatorId}`);

/**
 * Adds a piece of content to the currently logged-in fan's gallery.
 * @param contentId The ID of the content to add.
 */
export const addContentToGallery = async (contentId: string) => {
    // The server route is POST /api/v1/users/me/gallery
    // The body should contain the contentId
    const response = await apiClient.post('/users/me/gallery', { contentId });
    return response.data;
};

/**
 * Removes a piece of content from the currently logged-in fan's gallery.
 * @param contentId The ID of the content to remove.
 */
export const removeContentFromGallery = async (contentId: string) => {
    // The server route is DELETE /api/v1/users/me/gallery/:contentId
    const response = await apiClient.delete(`/users/me/gallery/${contentId}`);
    return response.data;
};

/**
 * Fetches the personalized gallery for the logged-in fan.
 */
export const getFanGallery = () =>
    api('get', '/users/me/gallery');

/**
 * Fetches all settings for the currently logged-in fan.
 */
export const getFanSettings = () =>
    api('get', '/users/me/settings');

/**
 * Updates the settings for the currently logged-in fan.
 * @param settings - The settings object to save.
 */
export const updateFanSettings = (settings: any) =>
    api('put', '/users/me/settings', settings);

/**
 * Sends a request to update a fan's subscription to a new tier.
 * @param subscriptionId - The ID of the subscription to update.
 * @param newTierId - The ID of the new tier.
 */
export const updateFanSubscription = (subscriptionId: string, newTierId: string) =>
    api('put', `/subscriptions/${subscriptionId}`, { newTierId });



/**
 * Submits a new support ticket from a user.
 * @param subject - The subject of the support ticket.
 * @param description - The detailed description of the issue.
 */
export const submitSupportTicket = (subject: string, description: string) =>
    api('post', '/support/tickets', { subject, description });

/**
 * Submits a reply to a support ticket as an admin.
 * @param ticketId The ID of the ticket to reply to.
 * @param text The content of the reply message.
 */
export const replyToSupportTicket = (ticketId: string, text: string) =>
    api('put', `/support/tickets/${ticketId}/reply`, { text });



/**
 * Fetches a user by their ID.
 * @param userId - The ID of the user to fetch.
 */
export const getUserById = (userId: string) =>
    api<{ success: boolean, data: User }>('get', `/users/${userId}`);

/**
 * Fetches all recent activity for a given creator.
 * @param creatorId - The ID of the creator.
 * @param page - The page number for pagination.
 * @param limit - The number of items per page.
 */
export const getCreatorActivity = (creatorId: string, page: number = 1, limit: number = 10) =>
    api('get', `/creator/activity?page=${page}&limit=${limit}`);

/**
 * Fetches all data needed for the content viewer page.
 * @param contentId The ID of the content to fetch data for.
 */
export const getContentViewerData = (contentId: string) =>
    api('get', `/content/${contentId}/viewer-data`);







/**
 * Reports a piece of content.
 * @param contentId The ID of the content to report.
 * @param reason The reason for reporting.
 */
export const reportContent = (contentId: string, reason: string) =>
    api('post', `/content/${contentId}/report`, { reason });



/**
 * Updates the status of a piece of content (Admin only).
 * @param contentId The ID of the content.
 * @param status The new status ('published', 'flagged', 'removed').
 */
export const updateContentStatus = (contentId: string, status: string) =>
    api('put', `/admin/content/${contentId}/status`, { status });


export const generateReport = (reportParams: any) =>
    api('post', '/admin/reports', reportParams);

/**
 * Gets platform-wide analytics data with filtering.
 */
export const getPlatformAnalytics = async (params: {
    period?: string;
    groupBy?: 'month' | 'day';
    creatorId?: string;
    year?: number;
    month?: string;
    startDate?: string;
    endDate?: string;
} = {}) => {
    const query = new URLSearchParams();
    if (params.period) query.append('period', params.period);
    if (params.groupBy) query.append('groupBy', params.groupBy);
    if (params.creatorId) query.append('creatorId', params.creatorId);
    if (params.year) query.append('year', params.year.toString());
    if (params.month) query.append('month', params.month);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    const response = await apiClient.get(`/admin/analytics?${query.toString()}`);
    return response.data;
};

export const getSavedReports = () =>
    api('get', '/admin/reports');

/**
 * Sends a direct email message to a user (Admin only).
 * @param userId - The ID of the user to message.
 * @param subject - The subject of the email.
 * @param message - The body of the email.
 */
export const messageUser = (userId: string, subject: string, message: string) =>
    api('post', `/admin/users/${userId}/message`, { subject, message });

// --- Notification Endpoints ---

export const getNotifications = (limit?: number) =>
    api('get', `/notifications${limit ? `?limit=${limit}` : ''}`);

export const getUnreadNotificationCount = () =>
    api('get', '/notifications/unread-count');

export const markNotificationAsRead = (notificationId: string) =>
    api('put', `/notifications/${notificationId}/read`);

export const getCreatorTiers = () =>
    api('get', '/creator/tiers');

/**
 * Sends a broadcast message to all subscribers or a specific tier.
 * @param text - The message text.
 * @param minTierId - Optional ID of the minimum tier to filter by.
 */
export const broadcastMessage = (text: string, minTierId?: string) =>
    api('post', '/creator/broadcast', { text, minTierId });



// --- Contest Endpoints ---

export const createContest = (contestData: any) =>
    api('post', '/contests', contestData);

export const getMyContests = () =>
    api('get', '/contests/creator/my');

export const publishContest = (contestId: string) =>
    api('put', `/contests/${contestId}/publish`);

export const finalizeContest = (contestId: string) =>
    api('post', `/contests/${contestId}/finalize`);

export const getFanContests = () =>
    api('get', '/contests/feed');

export const enterContest = (contestId: string) =>
    api('post', `/contests/${contestId}/enter`);


export const deleteNotification = (notificationId: string) =>
    api('delete', `/notifications/${notificationId}`);

/**
 * Generates an AI caption for an image URL.
 * @param imageUrl The public URL of the image.
 */
export const generateCaption = (image: string | File) => {
    if (typeof image === 'string') {
        return apiClient.post<{ status: string; data: { caption: string } }>('/ai/caption', { imageUrl: image });
    } else {
        const formData = new FormData();
        formData.append('image', image);
        return apiClient.post<{ status: string; data: { caption: string } }>('/ai/caption', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }
};

/**
 * Links a crypto wallet address to the current user's profile.
 * @param walletAddress - The wallet address to link.
 */
export const linkWallet = (walletAddress: string) =>
    api('put', '/users/me/settings', { profile: { crypto_wallet_address: walletAddress } });

export const getReferrerEarnings = () =>
    api('get', '/referrals/earnings');

// --- End of API Client ---
export default apiClient;