/**
 * Logger utility for consistent logging across the application
 * Controls logging based on environment and provides safe methods for logging
 * that avoid exposing sensitive information in production
 */

// Check if we're in production mode
const isProduction = import.meta.env.PROD === true;

// Define log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Current log level - in production, only show warnings and errors
const currentLogLevel = isProduction ? LogLevel.WARN : LogLevel.DEBUG;

/**
 * Safely logs messages based on environment and log level
 * In production, sensitive data is redacted
 */
export const logger = {
  /**
   * Debug level logging - only shown in development
   * @param message The message to log
   * @param data Optional data to include
   */
  debug: (message: string, data?: any) => {
    if (currentLogLevel <= LogLevel.DEBUG) {
      if (data) {
        // In production, don't log data at debug level
        if (isProduction) {
          console.debug(`[DEBUG] ${message} [data redacted in production]`);
        } else {
          console.debug(`[DEBUG] ${message}`, data);
        }
      } else {
        console.debug(`[DEBUG] ${message}`);
      }
    }
  },

  /**
   * Info level logging
   * @param message The message to log
   * @param data Optional data to include (sensitive data will be redacted in production)
   */
  info: (message: string, data?: any) => {
    if (currentLogLevel <= LogLevel.INFO) {
      if (data) {
        // In production, redact potentially sensitive data
        if (isProduction) {
          console.info(`[INFO] ${message} [data redacted in production]`);
        } else {
          console.info(`[INFO] ${message}`, data);
        }
      } else {
        console.info(`[INFO] ${message}`);
      }
    }
  },

  /**
   * Warning level logging
   * @param message The message to log
   * @param data Optional data to include (sensitive data will be redacted in production)
   */
  warn: (message: string, data?: any) => {
    if (currentLogLevel <= LogLevel.WARN) {
      if (data) {
        // In production, redact sensitive fields from the data
        if (isProduction && data) {
          const sanitizedData = sanitizeData(data);
          console.warn(`[WARN] ${message}`, sanitizedData);
        } else {
          console.warn(`[WARN] ${message}`, data);
        }
      } else {
        console.warn(`[WARN] ${message}`);
      }
    }
  },

  /**
   * Error level logging
   * @param message The message to log
   * @param error Optional error object or data to include
   */
  error: (message: string, error?: any) => {
    if (currentLogLevel <= LogLevel.ERROR) {
      if (error) {
        // Always log errors, but sanitize sensitive data in production
        if (isProduction && typeof error === 'object') {
          const sanitizedError = sanitizeData(error);
          console.error(`[ERROR] ${message}`, sanitizedError);
        } else {
          console.error(`[ERROR] ${message}`, error);
        }
      } else {
        console.error(`[ERROR] ${message}`);
      }
    }
  },
};

/**
 * Sanitizes data to remove sensitive information
 * @param data The data to sanitize
 * @returns Sanitized data with sensitive fields redacted
 */
function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // List of sensitive field names to redact
  const sensitiveFields = [
    'password', 'token', 'access_token', 'refresh_token', 'api_key', 
    'apiKey', 'secret', 'key', 'authorization', 'auth', 'jwt',
    'default_api_key', 'default_api_key_id'
  ];

  // Create a copy of the data to avoid modifying the original
  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  // Recursively sanitize the data
  Object.keys(sanitized).forEach(key => {
    // Check if this is a sensitive field
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } 
    // Recursively sanitize nested objects
    else if (sanitized[key] && typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  });

  return sanitized;
}

export default logger;
