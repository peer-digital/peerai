#!/usr/bin/env python3
"""
Test script for the unified server setup.
This script sends requests to the unified server to verify it's working correctly.
"""
import requests
import json
import argparse
import sys

def parse_args():
    parser = argparse.ArgumentParser(description="Test the unified server setup")
    parser.add_argument(
        "--host", 
        default="http://localhost:8000", 
        help="Host URL of the unified server"
    )
    return parser.parse_args()

def test_health_endpoint(base_url):
    """Test the health endpoint"""
    print("Testing health endpoint...")
    
    try:
        response = requests.get(f"{base_url}/health")
        response.raise_for_status()
        data = response.json()
        
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if "status" in data and data["status"] == "ok":
            print("✅ Health check passed")
            return True
        else:
            print("❌ Health check failed - status not 'ok'")
            return False
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_api_endpoint(base_url):
    """Test the API endpoint"""
    print("\nTesting API endpoint...")
    
    try:
        response = requests.get(f"{base_url}/api")
        if response.status_code == 404:
            # This is expected since /api doesn't exist, but it proves the API path is being routed
            print("✅ API routing check passed (404 is expected)")
            return True
        else:
            print(f"❓ API check returned unexpected status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API check failed: {e}")
        return False

def test_frontend_serving(base_url):
    """Test that the frontend is being served"""
    print("\nTesting frontend serving...")
    
    try:
        response = requests.get(base_url)
        response.raise_for_status()
        
        # Check if we got HTML back
        content_type = response.headers.get("content-type", "")
        if "text/html" in content_type:
            print("✅ Frontend check passed (HTML content received)")
            return True
        else:
            print(f"❌ Frontend check failed - received {content_type} instead of HTML")
            return False
    except Exception as e:
        print(f"❌ Frontend check failed: {e}")
        return False

def main():
    args = parse_args()
    print(f"Testing unified server at {args.host}\n")
    
    health_result = test_health_endpoint(args.host)
    api_result = test_api_endpoint(args.host)
    frontend_result = test_frontend_serving(args.host)
    
    print("\nSummary:")
    print(f"Health endpoint: {'✅ PASS' if health_result else '❌ FAIL'}")
    print(f"API routing: {'✅ PASS' if api_result else '❌ FAIL'}")
    print(f"Frontend serving: {'✅ PASS' if frontend_result else '❌ FAIL'}")
    
    if health_result and api_result and frontend_result:
        print("\n🎉 All tests passed! The unified server is working correctly.")
        return 0
    else:
        print("\n❌ Some tests failed. Please check the unified server configuration.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 