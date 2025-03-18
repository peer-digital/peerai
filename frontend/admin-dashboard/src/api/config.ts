import axios from 'axios';
import { toast } from 'react-toastify';
import { API_BASE_URL, API_PREFIX } from '../config';

console.log('Environment:', import.meta.env.VITE_APP_ENV);
console.log('API Base URL from env:', import.meta.env.VITE_API_BASE_URL);
console.log('API Base URL from config:', API_BASE_URL);

// Determine if we're in development mode
const isDevelopment = import.meta.env.MODE === 'development' || 
                     import.meta.env.VITE_APP_ENV === 'development' ||
                     window.location.hostname === 'localhost';

// @important: API base URL for development to avoid env variable issues
const apiBaseUrl = isDevelopment ? 'http://localhost:8000/api' : API_BASE_URL;

console.log('Using API Base URL:', apiBaseUrl);
console.log('Development mode:', isDevelopment);

// Create axios instance with default config
const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Changed to false since we're using token auth
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Ensure all requests use the API prefix consistently
    if (config.url && !config.url.startsWith('/')) {
      config.url = `/${config.url}`;
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