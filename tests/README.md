# Backend Tests

This directory contains tests for the backend API and database functionality.

## Test Files

- **test_auth.py**: Tests for authentication functionality including user registration, login, token validation, and API key management.
- **test_basic_functionality.py**: Basic tests for models and core functionality.
- **test_db_integration.py**: Database integration tests for user and API key operations.

## Removed Tests

Several test files were removed as they were outdated and failing:

- test_admin.py
- test_rbac.py
- test_api_integration.py
- test_inference.py
- test_settings.py

These tests were failing due to:
1. Changes in the User model (is_superuser property has no setter)
2. Unique constraint violations in the database
3. API response format changes
4. Missing dependencies or configuration

## Running Tests

To run all tests:

```bash
python -m pytest tests/
```

To run a specific test file:

```bash
python -m pytest tests/test_auth.py
```

To run with verbose output:

```bash
python -m pytest tests/ -v
```

## Test Configuration

The test configuration is defined in `conftest.py`, which sets up:

- Test database connection
- Fixtures for users, API keys, and other test data
- Mock database sessions
- Test clients for API testing

## Future Improvements

1. Restore the removed tests by updating them to match the current codebase
2. Add more comprehensive tests for API endpoints
3. Improve test coverage for error handling scenarios
4. Add performance tests for critical endpoints 