# Secure Logging Implementation

This document describes the secure logging implementation that has been added to the application to prevent sensitive information from being exposed in console logs.

## Overview

The application now uses a centralized logging utility that:

1. Controls logging based on the current environment (development vs. production)
2. Automatically redacts sensitive information in production
3. Provides consistent logging methods with appropriate log levels
4. Makes it easy to control what information is logged

## Logger Utility

The logger utility is implemented in `frontend/admin-dashboard/src/utils/logger.ts` and provides the following methods:

- `logger.debug()` - For development-only debugging information
- `logger.info()` - For general information
- `logger.warn()` - For warnings
- `logger.error()` - For errors

In production mode:
- Debug logs are completely suppressed
- Info logs with data objects are redacted
- Warning and error logs have sensitive fields redacted

## Sensitive Information Protection

The logger automatically redacts the following types of sensitive information:

- API keys
- Authentication tokens
- Passwords
- User credentials
- Other sensitive fields based on name patterns

## Usage Examples

Instead of using direct `console.log` calls:

```javascript
// BEFORE - Insecure
console.log('User data:', userData);
console.log(`API key: ${apiKey}`);
```

Use the logger utility:

```javascript
// AFTER - Secure
logger.debug('User authenticated', userData);
logger.info('API request completed', { requestId });
```

## Components Updated

The following components have been updated to use the secure logging utility:

1. `AuthService` - Removed sensitive token and user data logging
2. `Dashboard` - Secured usage statistics logging
3. `AuthDebug` - Secured authentication debugging
4. `EnhancedConfigForm` - Secured schema and configuration logging
5. `FileUploadWidget` - Secured file upload and processing logs
6. `Playground` - Secured API key handling and masked API keys in logs
7. `ApiKeySelector` - Secured API key selection and validation logs

## Environment-Based Logging

The logging level is automatically determined based on the environment:

- In development: All log levels are shown (DEBUG, INFO, WARN, ERROR)
- In production: Only WARN and ERROR levels are shown, with sensitive data redacted

## Best Practices

When adding new logging:

1. Use the appropriate log level based on importance
2. Never log sensitive information directly
3. Use object parameters instead of string interpolation for structured logging
4. Be mindful of what information might be sensitive

## Testing

You can test the logger's behavior by:

1. Running in development mode to see all logs
2. Setting `import.meta.env.PROD = true` temporarily to see production behavior
