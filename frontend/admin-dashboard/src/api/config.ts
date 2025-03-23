import axios from 'axios';
import { toast } from 'react-toastify';

// @important: API base URL configuration
// Use environment variable with fallback to VM IP address
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://158.174.210.91';

console.log('Environment:', import.meta.env.MODE);
console.log('API Base URL from env:', import.meta.env.VITE_API_BASE_URL);
console.log('API Base URL from config:', API_BASE_URL);

// Add a compatibility layer for different backend versions
const API_PREFIX = '/api';
const FULL_API_URL = `${API_BASE_URL}${API_PREFIX}`;

console.log('Using API Base URL:', FULL_API_URL);
console.log('Development mode:', import.meta.env.DEV === true);
console.log('Same Origin Deployment:', API_BASE_URL === window.location.origin);

// Create axios instance with default config
const api = axios.create({
  baseURL: FULL_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Set to false to avoid CORS issues with credentials
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
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

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      // Handle specific error cases
      switch (error.response.status) {
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
      toast.error('Network error. Please check your connection.');
    }
    return Promise.reject(error);
  }
);

export default api; 