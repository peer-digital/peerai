#!/usr/bin/env python3
"""
Environment validation script.
Checks if all required environment variables are set and validates their values.
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Optional
import json

# Add the parent directory to PYTHONPATH
current_dir = Path(__file__).parent.parent
sys.path.insert(0, str(current_dir))

from config import settings

REQUIRED_PROD_VARS = {
    "DATABASE_URL": "Production database connection string",
    "JWT_SECRET_KEY": "JWT secret key for authentication",
    "EXTERNAL_LLM_API_KEY": "External LLM API key",
}

REQUIRED_TEST_VARS = {
    "TEST_DATABASE_URL": "Test database connection string",
}

def validate_database_url(url: str) -> bool:
    """Validate database URL format."""
    required_parts = ["postgresql://", "@", "/"]
    return all(part in url for part in required_parts)

def validate_origins(origins: List[str]) -> bool:
    """Validate CORS origins."""
    return all(
        origin.startswith(("http://", "https://"))
        for origin in origins
    )

def validate_environment() -> Dict[str, List[str]]:
    """Validate environment configuration."""
    errors: Dict[str, List[str]] = {"critical": [], "warnings": []}
    
    # Check environment-specific required variables
    required_vars = REQUIRED_PROD_VARS if settings.ENVIRONMENT == "production" else {}
    if settings.ENVIRONMENT == "test":
        required_vars.update(REQUIRED_TEST_VARS)

    # Validate required variables
    for var, description in required_vars.items():
        value = getattr(settings, var, None)
        if not value:
            errors["critical"].append(f"Missing {var}: {description}")

    # Validate database URL
    if not validate_database_url(settings.DATABASE_URL):
        errors["critical"].append("Invalid DATABASE_URL format")

    # Validate CORS origins
    if not validate_origins(settings.ALLOWED_ORIGINS):
        errors["warnings"].append("Invalid CORS origin format detected")

    # Production-specific validations
    if settings.ENVIRONMENT == "production":
        if settings.DEBUG:
            errors["critical"].append("DEBUG mode enabled in production")
        if settings.MOCK_MODE:
            errors["critical"].append("MOCK_MODE enabled in production")
        if settings.JWT_SECRET_KEY == "development-only-key":
            errors["critical"].append("Using default JWT_SECRET_KEY in production")

    return errors

def main():
    """Main validation function."""
    print(f"\nValidating environment: {settings.ENVIRONMENT}")
    print("-" * 50)

    errors = validate_environment()

    if errors["critical"]:
        print("\n❌ Critical Issues:")
        for error in errors["critical"]:
            print(f"  • {error}")

    if errors["warnings"]:
        print("\n⚠️  Warnings:")
        for warning in errors["warnings"]:
            print(f"  • {warning}")

    if not errors["critical"] and not errors["warnings"]:
        print("\n✅ Environment validation passed!")
        return 0

    if errors["critical"]:
        print("\n❌ Environment validation failed!")
        return 1

    print("\n⚠️  Environment validation passed with warnings!")
    return 0

if __name__ == "__main__":
    sys.exit(main()) 