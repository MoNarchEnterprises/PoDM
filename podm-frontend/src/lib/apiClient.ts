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
const API_BASE_URL = 'http://localhost:5000/api/v1'; // Assuming your backend runs on port 5000

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
        // In a real app, you would get the token from a secure place like
        // localStorage, a cookie, or your authentication context (useAuth hook).
        const token = localStorage.getItem('authToken'); 

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // If the request data is FormData (i.e., a file upload),
        // we must remove the default 'Content-Type' header.
        // This allows the browser to automatically set the correct
        // 'multipart/form-data' header with the required boundary.
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
        if (error.response?.status === 401) {
            // Handle unauthorized errors, e.g., redirect to login
            console.error("Unauthorized request. Redirecting to login.");
            localStorage.removeItem('authToken');
            alert("Your session has expired. Please log in again.");
            window.location.href = '/'; 
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
    console.log("API Client: Signup response:", response.data);
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
    console.log('apiClients: Profile data to update:', profileData);
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
export const sendTip = async (creatorId: string, amount: number, message: string | undefined, contentId: string) => {
    console.log(`[apiClient] Sending tip of $${amount} to creator ${creatorId} for content ${contentId}`);
    const response = await apiClient.post('/payments/tip', {
        creatorId,
        amount: Math.round(amount * 100), // Convert to cents for the backend
        message,
        contentId,
    });
    // The backend returns { success: true, data: { clientSecret: 'pi_...' } }
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
        await apiClient.post('/analytics/log', data);
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
 * Gets a secure, temporary URL for a piece of content.
 * @param contentId The ID of the content.
 */
export const getSecureContentUrl = async (contentId: string) => {
    const response = await apiClient.get(`/content/${contentId}/secure-url`);
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
    // Note: You will need to create this backend endpoint next.
    // POST /api/v1/support/tickets
    const response = await apiClient.post('/support/tickets', { subject, description });
    return response.data;
};

export default apiClient;
