import axios from 'axios';
import { toast } from 'react-toastify';

// @important: API base URL configuration
// In development, we use the Vite proxy which is configured to localhost:8000
// In production, this will be overridden by VITE_API_BASE_URL environment variable
const API_BASE_URL = import.meta.env.DEV
  ? '' // In development, we use the Vite proxy which already includes /api/v1
  : (import.meta.env.VITE_API_BASE_URL || 'https://peerai-be.onrender.com');

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.DEV
    ? '/api/v1'  // Development environment
    : `${API_BASE_URL}/api/v1`,  // Add /api/v1 back for production environment
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Set to false to avoid CORS issues with credentials
  maxRedirects: 5, // Allow redirects
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('access_token');
    if (token) {
      // Make sure we're setting the Authorization header correctly
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      // Ensure content type is set for POST requests
      if (config.method?.toLowerCase() === 'post') {
        config.headers['Content-Type'] = 'application/json';
      }
      console.log(`Adding Authorization header for ${config.url}:`, `Bearer ${token.substring(0, 10)}...`);
      console.log('Full headers:', config.headers);
    } else {
      console.warn(`No token found for request to ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`Response from ${response.config.url}:`, response);
    return response;
  },
  async (error) => {
    console.error('API Error:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);

      // Handle specific error cases
      switch (error.response.status) {
        case 401:
          console.error('Authentication error - token may be invalid or expired');
          console.error('Current token:', localStorage.getItem('access_token'));
          break;
        case 403:
          toast.error('You do not have permission to perform this action');
          break;
        case 429:
          toast.error('Rate limit exceeded. Please try again later.');
          break;
        default:
          if (error.response.status !== 401) { // Don't show error toast for auth errors
            toast.error(error.response.data?.detail || 'An error occurred');
          }
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
      toast.error('Network error. Please check your connection.');
    } else {
      console.error('Error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;