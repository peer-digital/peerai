#!/bin/bash

# check_deployment.sh - Verify deployment status on the VM
# @description: Checks if the deployment was successful by verifying service status,
#               frontend build, backend environment, and service accessibility.

# Stop script on errors
set -e

echo "Starting deployment verification..."

# --- Check if service is running ---
echo "Checking peerai-backend service status..."
if ! systemctl is-active --quiet peerai-backend.service; then
    echo "ERROR: peerai-backend service is not running!"
    echo "Service status:"
    systemctl status peerai-backend.service --no-pager
    exit 1
fi
echo "✓ Service is running"

# --- Check frontend build ---
echo "Checking frontend build..."
if [ ! -d "frontend/admin-dashboard/dist" ]; then
    echo "ERROR: Frontend build directory not found!"
    exit 1
fi
echo "✓ Frontend build present"

# --- Check backend environment ---
echo "Checking backend environment..."
if [ ! -f ".venv/bin/uvicorn" ]; then
    echo "ERROR: Backend virtual environment not properly set up!"
    echo "Missing uvicorn executable"
    exit 1
fi
echo "✓ Backend environment verified"

# --- Check environment variables ---
echo "Checking critical environment variables..."
required_vars=(
    "DATABASE_URL"
    "JWT_SECRET_KEY"
    "GOOGLE_APPLICATION_CREDENTIALS"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "ERROR: Required environment variable $var is not set!"
        exit 1
    fi
done
echo "✓ Environment variables verified"

# --- Check service accessibility ---
echo "Checking service accessibility..."
PORT=8000  # @note: Default port from deploy.sh
if ! curl -s "http://localhost:$PORT/health" > /dev/null; then
    echo "ERROR: Service is not accessible on port $PORT!"
    echo "Checking service logs:"
    journalctl -u peerai-backend.service -n 50 --no-pager
    exit 1
fi
echo "✓ Service is accessible"

echo "Deployment verification completed successfully!" 