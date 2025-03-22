#!/usr/bin/env python3
"""
Pre-launch checklist script for PeerAI
Performs automated checks before deployment
"""

import os
import sys
import subprocess
import requests
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables from env file
load_dotenv()


def check_environment_variables() -> List[str]:
    """Check if all required environment variables are set"""
    required_vars = [
        "DATABASE_URL",
        "HOSTED_LLM_URL",
        "EXTERNAL_LLM_URL",
        "HOSTED_LLM_API_KEY",
        "EXTERNAL_LLM_API_KEY",
        "SECRET_KEY",
    ]

    missing = []
    for var in required_vars:
        if not os.getenv(var):
            missing.append(var)
    return missing


def run_tests() -> bool:
    """Run the test suite"""
    env = os.environ.copy()
    env["PYTHONPATH"] = os.getcwd()
    result = subprocess.run(
        ["pytest", "-v", "--cov"], env=env, capture_output=True, text=True
    )
    print(result.stdout)
    return result.returncode == 0


def check_database_migration() -> bool:
    """Check if database is up to date with migrations"""
    result = subprocess.run(["alembic", "current"], capture_output=True, text=True)
    return "head" in result.stdout


def scan_for_secrets() -> List[str]:
    """Scan codebase for potential secrets"""
    # Using trufflehog for secret scanning
    result = subprocess.run(
        ["trufflehog", "filesystem", "."], capture_output=True, text=True
    )
    return result.stdout.split("\n") if result.stdout else []


def check_api_endpoints(base_url: str, test_api_key: str) -> Dict[str, Any]:
    """Test key API endpoints"""
    headers = {"X-API-Key": test_api_key}
    results = {}

    # Test health endpoint
    try:
        health = requests.get(f"{base_url}/health")
        results["health"] = health.status_code == 200
    except Exception as e:
        results["health"] = False
        results["health_error"] = str(e)

    # Test completion endpoint with mock mode
    try:
        completion = requests.post(
            f"{base_url}/api/v1/completions",
            headers=headers,
            json={"prompt": "test", "mock_mode": True},
        )
        results["completion"] = completion.status_code == 200
    except Exception as e:
        results["completion"] = False
        results["completion_error"] = str(e)

    return results


def main():
    print("Running PeerAI Pre-launch Checks...")

    # Check environment variables
    missing_vars = check_environment_variables()
    if missing_vars:
        print("❌ Missing environment variables:", missing_vars)
        sys.exit(1)
    print("✅ Environment variables check passed")

    # Run tests
    if run_tests():
        print("✅ Test suite passed")
    else:
        print("❌ Test suite failed")
        sys.exit(1)

    # Check database migrations
    if check_database_migration():
        print("✅ Database migrations are up to date")
    else:
        print("❌ Database migrations need to be applied")
        sys.exit(1)

    # Scan for secrets
    secrets = scan_for_secrets()
    if secrets:
        print("⚠️ Potential secrets found in codebase:")
        for secret in secrets:
            print(f"  - {secret}")
    else:
        print("✅ No secrets found in codebase")

    # Check API endpoints
    base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
    test_api_key = os.getenv("TEST_API_KEY")

    if test_api_key:
        results = check_api_endpoints(base_url, test_api_key)
        for endpoint, status in results.items():
            if status:
                print(f"✅ {endpoint} endpoint check passed")
            else:
                print(f"❌ {endpoint} endpoint check failed")
                if f"{endpoint}_error" in results:
                    print(f"   Error: {results[f'{endpoint}_error']}")

    print("\nPre-launch checks completed!")


if __name__ == "__main__":
    main()
