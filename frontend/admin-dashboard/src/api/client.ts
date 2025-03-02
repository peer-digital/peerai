import axios from 'axios';

// @important: Base URL for API requests
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor for authentication
apiClient.interceptors.request.use(
    (config) => {
        // Use the same key as in auth.service.ts (ACCESS_TOKEN_KEY)
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
        }
        return Promise.reject(error);
    }
); 