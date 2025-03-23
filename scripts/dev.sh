#!/bin/bash

# dev.sh - Run both frontend and backend services concurrently
# @author: PeerAI Developer
# @description: This script runs the frontend and backend services concurrently for local development

# Stop script on first error
set -e

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed or not in the PATH"
    exit 1
fi

# Install local dependencies if needed
if [ ! -f "node_modules/.package-lock.json" ]; then
    echo "Installing project dependencies..."
    npm install
fi

# Check for Python virtual environment
if [ ! -d ".venv" ]; then
    echo "Python virtual environment not found. Creating one..."
    python -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install backend dependencies if needed
if [ ! -f ".venv/installed" ]; then
    echo "Installing backend dependencies..."
    pip install -r backend/requirements.txt
    touch .venv/installed
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/admin-dashboard/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend/admin-dashboard && npm install && cd ../..
fi

# Run both services concurrently using npx
echo "Starting both frontend and backend services..."
npx concurrently \
    --names "BACKEND,FRONTEND" \
    --prefix-colors "blue,green" \
    --kill-others \
    "cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000" \
    "cd frontend/admin-dashboard && npm run dev"

# Note: The --kill-others flag ensures that if one process exits, all others are killed as well 