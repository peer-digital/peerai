import axios from 'axios';

// Get the API base URL from environment variables or use a default
const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.VITE_APP_ENV === 'development';
const API_BASE_URL = isDevelopment
    ? 'http://localhost:8000/api'  // Corrected: /api for local dev
    : (import.meta.env.VITE_API_BASE_URL || 'http://158.174.210.91/api'); // /api for production
console.log("API BASE URL: " + API_BASE_URL);

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: false, // We're using token-based auth, not cookies.
});

// Request interceptor for adding the auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response) {
            // Handle specific error cases
            switch (error.response.status) {
                case 401:
                    // Unauthorized - clear token and redirect to login
                    localStorage.removeItem('access_token');
                    window.location.href = '/login';
                    break;
                case 403:
                    // Forbidden - user doesn't have required permissions
                    console.error('Access denied:', error.response.data.detail);
                    break;
                case 404:
                    // Not found
                    console.error('Resource not found:', error.response.data.detail);
                    break;
                default:
                    // Other errors
                    console.error('API Error:', error.response.data.detail);
            }
        } else if (error.request) {
            // The request was made but no response was received
            console.error('Network Error:', error.message);
        } else {
            // Something happened in setting up the request
            console.error('Error:', error.message);
        }
        return Promise.reject(error);
    }
); 