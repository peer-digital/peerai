// @important: API base URL configuration
const isDevelopment = import.meta.env.VITE_APP_ENV !== 'production';

// @important: Set different default base URLs based on environment
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:8000' 
  : (import.meta.env.VITE_API_BASE_URL || 'http://158.174.210.91');

// @important: API prefix is now consistent between environments
export const API_PREFIX = '/api';

// @important: Support for relative URLs to work in same-origin deployments
export const getApiUrl = (path: string) => {
  // If same origin, use relative URL (just the path with prefix)
  if (window.location.origin === API_BASE_URL || 
      // Also handle IP without protocol
      window.location.origin === `http://${API_BASE_URL}` ||
      // Also handle https version
      window.location.origin === `https://${API_BASE_URL.replace('http://', '')}`) {
    return `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
  }
  // Otherwise use absolute URL
  return `${API_BASE_URL}${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
};

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