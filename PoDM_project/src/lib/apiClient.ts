import axios from 'axios';

// --- Configuration ---

/**
 * The base URL for all API requests.
 * In a real application, this would come from an environment variable.
 * e.g., process.env.REACT_APP_API_URL
 */
const API_BASE_URL = 'https://api.yourplatform.com/v1';

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
        // Handle common error statuses globally.
        if (error.response) {
            const { status } = error.response;

            if (status === 401) {
                // Unauthorized: The user is not logged in or their token is invalid.
                // Redirect to the login page.
                console.error("Unauthorized request. Redirecting to login.");
                // window.location.href = '/login'; 
            }

            if (status === 403) {
                // Forbidden: The user is logged in but doesn't have permission.
                console.error("Forbidden. You don't have permission to access this resource.");
                // You might show a "Forbidden" page or a notification.
            }

            if (status === 500) {
                // Server Error: Something went wrong on the backend.
                console.error("Internal Server Error. Please try again later.");
                // You could show a generic error message to the user.
            }
        }
        
        // Return the error so that individual components can still handle it if needed.
        return Promise.reject(error);
    }
);

export default apiClient;
