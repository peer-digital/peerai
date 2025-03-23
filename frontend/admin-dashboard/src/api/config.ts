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
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for handling cookies/sessions
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