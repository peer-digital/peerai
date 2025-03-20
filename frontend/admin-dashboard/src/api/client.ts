import axios from 'axios';
import { API_BASE_URL, API_PREFIX, getApiUrl } from '../config';

// @important: Determine if we're using same-origin deployment
const isSameOrigin = window.location.origin === API_BASE_URL || 
                   window.location.origin === `http://${API_BASE_URL}` ||
                   window.location.origin === `https://${API_BASE_URL.replace('http://', '')}`;

// @important: Use baseURL that works for all deployment scenarios
const apiBaseUrl = isSameOrigin ? API_PREFIX : `${API_BASE_URL}${API_PREFIX}`;
console.log("API BASE URL: " + apiBaseUrl);

export const apiClient = axios.create({
    baseURL: apiBaseUrl,
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
        // Ensure all requests use consistent formatting
        if (config.url && !config.url.startsWith('/')) {
          config.url = `/${config.url}`;
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

// @important: Helper function for building API URLs dynamically
export const buildApiUrl = (path: string) => getApiUrl(path); 