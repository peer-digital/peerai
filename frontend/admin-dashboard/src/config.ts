// @important: API base URL configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://158.174.210.91';

// @important: API prefix is now consistent between environments
export const API_PREFIX = '/api';

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