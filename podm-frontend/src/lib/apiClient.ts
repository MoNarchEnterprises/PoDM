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

// --- Axios Instance Creation ---

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Interceptors ---

/**
 * Request Interceptor:
 * This function runs before every single request is sent.
 * Its primary job is to get the user's authentication token and add it
 * to the 'Authorization' header.
 */
apiClient.interceptors.request.use(
    (config) => {
        // Check localStorage first (persistent), then sessionStorage (temporary)
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const impersonatingUserId = localStorage.getItem('impersonating_user_id') || sessionStorage.getItem('impersonating_user_id');

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
        // Handle request errors (e.g., network issues)
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
export const login = async (email: string, password: string) => {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
        email,
        password,
    });
    return response.data;
};

/**
 * Sends a request to the backend to initiate the password reset process.
 * @param email - The user's email address.
 */
export const forgotPassword = async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
};

/**
 * Verifies the user's session and retrieves their data.
 * This is typically called on app load to check if the user is logged in.
 */
export const getMe = async () => {
    const response = await apiClient.get<AuthResponse>('/auth/me');
    return response.data;
};

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
export const signupAndSubscribe = async (data: any) => {
    const response = await apiClient.post('/auth/signup-and-subscribe', data);
    return response.data;
};

/**
 * Initiates a tip payment on the backend.
 * @param creatorId The ID of the creator to tip.
 * @param amount The tip amount IN DOLLARS.
 * @param message An optional message to include with the tip.
 * @returns The client_secret for the Stripe PaymentIntent.
 */
export const sendTip = async (creatorId: string, amount: number, message: string | undefined, contentId: string, paymentMethodId?: string) => {
    const response = await apiClient.post('/payments/tip', {
        creatorId,
        amount: Math.round(amount * 100), // Convert to cents
        message,
        contentId,
        paymentMethodId,
    });
    return response.data.data;
};

/**
 * Manually confirms a transaction after client-side payment confirmation.
 * @param paymentIntentId The ID of the Stripe PaymentIntent.
 */
export const confirmTransaction = async (paymentIntentId: string) => {
    const response = await apiClient.post('/payments/confirm-transaction', { paymentIntentId });
    return response.data.data;
};

/**
 * Sends a request to create a new subscription to a creator.
 * @param creatorId The ID of the creator to subscribe to.
 * @param tierId The internal ID of the selected subscription tier (e.g., 't1', 't2').
 * @param paymentMethodId The Payment Method ID generated by Stripe.js (e.g., 'pm_...').
 */
export const createSubscription = async (creatorId: string, tierId: string, paymentMethodId: string) => {
    const response = await apiClient.post('/subscriptions', {
        creatorId,
        tierId,
        paymentMethodId,
    });
    return response.data; // The backend will return { success: true, data: { requiresAction, clientSecret, ... } }
};

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
export const changePassword = async (data: { currentPassword: string, newPassword: string }) => {
    const response = await apiClient.post('/auth/change-password', data);
    return response.data;
};

/**
 * Gets the current platform settings.
 */
export const getPlatformSettings = async () => {
    const response = await apiClient.get('/admin/settings/platform');
    return response.data;
};

/**
 * Sends a request to update the platform settings.
 * @param settings - The settings object to update.
 */
export const updatePlatformSettings = async (settings: { commissionRate: number }) => {
    const response = await apiClient.put('/admin/settings/platform', settings);
    return response.data;
};

/**
 * Sends a request to update a user's status (e.g., active, suspended, banned).
 * @param userId - The ID of the user to update.
 * @param status - The new status to set.
 */
export const updateUserStatus = async (userId: string, status: string) => {
    const response = await apiClient.put<{ success: boolean, data: User }>(
        `/admin/users/${userId}/status`,
        { status }
    );
    return response.data;
};

/**
 * Sends a request to update a creator's custom commission rate.
 * @param creatorId - The ID of the creator to update.
 * @param commissionRate - The new rate to set (or null to reset to default).
 */
export const updateCreatorCommission = async (creatorId: string, commissionRate: number | null) => {
    const response = await apiClient.put<{ success: boolean, data: User }>(
        `/admin/users/${creatorId}/commission`,
        { commissionRate }
    );
    return response.data;
};

/**
 * Sends a request to complete the creator onboarding process.
 * @param onboardingData - The data from the onboarding form.
 */
export const completeCreatorOnboarding = async (onboardingData: any) => {
    const response = await apiClient.post<{ success: boolean, data: User }>('/users/me/onboarding', onboardingData);
    return response.data;
};

/**
 * Submits creator verification documents.
 * @param formData The FormData object containing files and signature.
 */
export const submitVerification = async (formData: FormData) => {
    const response = await apiClient.post('/users/me/verification', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

/**
 * Gets the secure, temporary URLs for a creator's verification documents.
 * @param userId The ID of the user whose documents are needed.
 */
export const getVerificationDocs = async (userId: string) => {
    const response = await apiClient.get(`/admin/users/${userId}/verification-docs`);
    return response.data;
};

/**
 * Gets all the necessary data for the creator dashboard.
 */
export const getCreatorDashboardData = async () => {
    const response = await apiClient.get('/creator/dashboard');
    return response.data;
};

/**
 * Gets all the necessary data for the creator analytics page.
 */
export const getCreatorAnalyticsData = async () => {
    const response = await apiClient.get('/creator/analytics');
    return response.data;
};

/**
 * Exports the creator analytics metrics as a CSV string.
 */
export const exportCreatorMetricsCSV = async () => {
    const response = await apiClient.get('/creator/metrics/export?format=csv', {
        responseType: 'text', // Ensure it is treated as text
    });
    return response.data;
};

/**
 * Exports the fan engagement metrics as a CSV string.
 */
export const exportCreatorFanEngagementCSV = async () => {
    const response = await apiClient.get('/creator/metrics/export-fans?format=csv', {
        responseType: 'text', 
    });
    return response.data;
};

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
export const deleteContent = async (contentId: string) => {
    const response = await apiClient.delete(`/content/${contentId}`);
    return response.data;
};

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
export const getPublicCreatorProfile = async (username: string) => {
    const response = await apiClient.get(`/users/profile/${username}`);
    return response.data;
};

/**
 * Gets all the necessary data for the creator earnings page.
 */
export const getCreatorEarningsData = async () => {
    const response = await apiClient.get('/creator/earnings');
    return response.data;
};

/**
 * Creates a Stripe Connect onboarding link for the current creator.
 * @returns The single-use URL to redirect the creator to.
 */
export const createStripeOnboardingLink = async () => {
    const response = await apiClient.post('/stripe/connect/onboarding-link');
    return response.data;
};

/**
 * Submits a payout request for the currently logged-in creator.
 * @param amount - The amount in dollars to withdraw.
 */
export const requestCreatorPayout = async (amount: number) => {
    const response = await apiClient.post('/creator/payouts', { amount });
    return response.data;
};

/**
 * Gets a secure, temporary URL for a piece of content.
 * @param contentId The ID of the content.
 */
export const getSecureContentUrl = async (contentId: string) => {
    const response = await apiClient.get(`/content/${contentId}/secure-url`);
    return response.data;
};

/**
 * Gets a secure, temporary URL for viewing a full-size piece of content.
 * @param contentId The ID of the content to view.
 */
export const getSecureContentViewUrl = async (contentId: string) => {
    const response = await apiClient.get(`/content/${contentId}/view`);
    return response.data;
};

/**
 * Fetches all conversations for the current user.
 */
export const getMyConversations = async () => {
    const response = await apiClient.get('/messages/conversations');
    return response.data;
};

/**
 * Fetches all messages for a specific conversation.
 * @param conversationId - The ID of the conversation.
 */
export const getMessagesInConversation = async (conversationId: string) => {
    const response = await apiClient.get(`/messages/conversations/${conversationId}`);
    return response.data;
};

/**
 * Creates a Payment Intent to unlock paid content in a message.
 * @param messageId - The ID of the message to unlock.
 * @returns An object containing the `clientSecret` from Stripe.
 */
export const unlockMessageContent = async (messageId: string) => {
    const response = await apiClient.post('/payments/unlock-message', { messageId });
    return response.data; // This will return { success: true, data: { clientSecret: '...' } }
};

/**
 * Notifies the backend that a conversation's messages have been read.
 * @param conversationId - The ID of the conversation.
 */
export const markConversationAsRead = async (conversationId: string) => {
    const response = await apiClient.put(`/messages/conversations/${conversationId}/read`);
    return response.data;
};

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
export const deleteMessage = async (messageId: string) => {
    const response = await apiClient.delete(`/messages/${messageId}`);
    return response.data;
};

/**
 * Sends a voice message to a fan.
 * @param formData - FormData containing the voice message audio file and receiverId.
 */
export const sendVoiceMessage = async (formData: FormData) => {
    const response = await apiClient.post('/messages/voice', formData);
    return response.data;
};

/**
 * Fetches the personalized content feed for the logged-in fan.
 * @param page The page number to fetch for infinite scrolling.
 */
export const getFanFeed = async (page: number = 1) => {
    const response = await apiClient.get(`/users/me/feed?page=${page}`);
    return response.data;
};

/**
 * Fetches all subscriptions for the currently logged-in fan.
 */
export const getFanSubscriptions = async () => {
    const response = await apiClient.get('/subscriptions');
    return response.data;
};

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
export const getFanGallery = async () => {
    const response = await apiClient.get('/users/me/gallery');
    return response.data;
};

/**
 * Fetches all settings for the currently logged-in fan.
 */
export const getFanSettings = async () => {
    const response = await apiClient.get('/users/me/settings');
    return response.data;
};

/**
 * Updates the settings for the currently logged-in fan.
 * @param settings - The settings object to save.
 */
export const updateFanSettings = async (settings: any) => {
    const response = await apiClient.put('/users/me/settings', settings);
    return response.data;
};

/**
 * Sends a request to update a fan's subscription to a new tier.
 * @param subscriptionId - The ID of the subscription to update.
 * @param newTierId - The ID of the new tier.
 */
export const updateFanSubscription = async (subscriptionId: string, newTierId: string) => {
    const response = await apiClient.put(`/subscriptions/${subscriptionId}`, { newTierId });
    return response.data;
};

/**
 * Updates the fan's default payment method in Stripe.
 * @param paymentMethodId - The secure `pm_...` token from Stripe Elements.
 */
export const updateFanPaymentMethod = async (paymentMethodId: string) => {
    const response = await apiClient.put('/users/me/payment-method', { paymentMethodId });
    return response.data;
};

/**
 * Submits a new support ticket from a user.
 * @param subject - The subject of the support ticket.
 * @param description - The detailed description of the issue.
 */
export const submitSupportTicket = async (subject: string, description: string) => {
    const response = await apiClient.post('/support/tickets', { subject, description });
    return response.data;
};

/**
 * Submits a reply to a support ticket as an admin.
 * @param ticketId The ID of the ticket to reply to.
 * @param text The content of the reply message.
 */
export const replyToSupportTicket = async (ticketId: string, text: string) => {
    const response = await apiClient.put(`/support/tickets/${ticketId}/reply`, { text });
    return response.data;
};

/**
 * Creates a Stripe SetupIntent on the backend to prepare for saving a new payment method.
 * @returns The clientSecret for the SetupIntent.
 */
export const createSetupIntent = async () => {
    const response = await apiClient.post('/users/me/setup-payment-method');
    return response.data;
};

/**
 * Fetches a user by their ID.
 * @param userId - The ID of the user to fetch.
 */
export const getUserById = async (userId: string) => {
    const response = await apiClient.get<{ success: boolean, data: User }>(`/users/${userId}`);
    return response.data;
};

/**
 * Fetches all recent activity for a given creator.
 * @param creatorId - The ID of the creator.
 * @param page - The page number for pagination.
 * @param limit - The number of items per page.
 */
export const getCreatorActivity = async (creatorId: string, page: number = 1, limit: number = 10) => {
    const response = await apiClient.get(`/creator/activity?page=${page}&limit=${limit}`);
    return response.data;
};

/**
 * Fetches all data needed for the content viewer page.
 * @param contentId The ID of the content to fetch data for.
 */
export const getContentViewerData = async (contentId: string) => {
    const response = await apiClient.get(`/content/${contentId}/viewer-data`);
    return response.data;
};



/**
 * Creates a Stripe Payment Intent for a fan to purchase a piece of content.
 * @param contentId The ID of the content to purchase.
 * @param paymentMethodId Optional payment method ID if not using default.
 */
export const unlockPost = async (contentId: string, paymentMethodId?: string) => {
    const response = await apiClient.post('/payments/unlock-post', { contentId, paymentMethodId });
    return response.data;
};



/**
 * Reports a piece of content.
 * @param contentId The ID of the content to report.
 * @param reason The reason for reporting.
 */
export const reportContent = async (contentId: string, reason: string) => {
    const response = await apiClient.post(`/content/${contentId}/report`, { reason });
    return response.data;
};



/**
 * Updates the status of a piece of content (Admin only).
 * @param contentId The ID of the content.
 * @param status The new status ('published', 'flagged', 'removed').
 */
export const updateContentStatus = async (contentId: string, status: string) => {
    const response = await apiClient.put(`/admin/content/${contentId}/status`, { status });
    return response.data;
};


export const generateReport = async (reportParams: any) => {
    const response = await apiClient.post('/admin/reports', reportParams);
    return response.data;
};

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

export const getSavedReports = async () => {
    const response = await apiClient.get('/admin/reports');
    return response.data;
};

/**
 * Sends a direct email message to a user (Admin only).
 * @param userId - The ID of the user to message.
 * @param subject - The subject of the email.
 * @param message - The body of the email.
 */
export const messageUser = async (userId: string, subject: string, message: string) => {
    const response = await apiClient.post(`/admin/users/${userId}/message`, { subject, message });
    return response.data;
};

// --- Notification Endpoints ---

export const getNotifications = async (limit?: number) => {
    const response = await apiClient.get(`/notifications${limit ? `?limit=${limit}` : ''}`);
    return response.data;
};

export const getUnreadNotificationCount = async () => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
};

export const markNotificationAsRead = async (notificationId: string) => {
    const response = await apiClient.put(`/notifications/${notificationId}/read`);
    return response.data;
};

export const getCreatorTiers = async () => {
    const response = await apiClient.get('/creator/tiers');
    return response.data;
};

/**
 * Sends a broadcast message to all subscribers or a specific tier.
 * @param text - The message text.
 * @param minTierId - Optional ID of the minimum tier to filter by.
 */
export const broadcastMessage = async (text: string, minTierId?: string) => {
    const response = await apiClient.post('/creator/broadcast', { text, minTierId });
    return response.data;
};



// --- Contest Endpoints ---

export const createContest = async (contestData: any) => {
    const response = await apiClient.post('/contests', contestData);
    return response.data;
};

export const getMyContests = async () => {
    const response = await apiClient.get('/contests/creator/my');
    return response.data;
};

export const publishContest = async (contestId: string) => {
    const response = await apiClient.put(`/contests/${contestId}/publish`);
    return response.data;
};

export const finalizeContest = async (contestId: string) => {
    const response = await apiClient.post(`/contests/${contestId}/finalize`);
    return response.data;
};

export const getFanContests = async () => {
    const response = await apiClient.get('/contests/feed');
    return response.data;
};

export const enterContest = async (contestId: string) => {
    const response = await apiClient.post(`/contests/${contestId}/enter`);
    return response.data;
};


export const deleteNotification = async (notificationId: string) => {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return response.data;
};

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

// --- End of API Client ---
export default apiClient;