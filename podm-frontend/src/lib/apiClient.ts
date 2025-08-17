import axios from 'axios';
import { User, UserRole } from '@common/types/User';

// --- Configuration ---

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
            // window.location.href = '/login'; 
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
 * Verifies the user's session and retrieves their data.
 * This is typically called on app load to check if the user is logged in.
 */
export const getMe = async () => {
    const response = await apiClient.get<AuthResponse>('/auth/me');
    return response.data;
};


export default apiClient;
