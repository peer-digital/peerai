// @important: API base URL configuration
const isDevelopment = import.meta.env.VITE_APP_ENV !== 'production';

// @important: Set different default base URLs based on environment
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:8000/api' 
  : (import.meta.env.VITE_API_BASE_URL || 'http://158.174.210.91/api');

// @important: API prefix is now consistent between environments
export const API_PREFIX = '';

// @important: Default API key for development (should be empty in production)
export const DEFAULT_API_KEY = import.meta.env.VITE_DEFAULT_API_KEY || '';

// Application configuration
export const APP_CONFIG = {
  appName: 'Peer AI',
  version: '1.0.0',
  defaultPageSize: 10,
  maxUploadSize: 10 * 1024 * 1024, // 10MB
  supportEmail: 'support@peerdigital.se',
};

// Feature flags
export const FEATURES = {
  enableVision: false,
  enableAudio: false,
  enableTeams: true,
  enableAnalytics: true,
  enableModelRegistry: true,
}; 