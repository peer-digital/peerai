#!/bin/bash
# Start the Peer AI application in single server mode

# Stop on error
set -e

# Print commands
set -x

# Navigate to the project root
cd "$(dirname "$0")/.."

# Set up environment
echo "Setting up environment..."

# Check if frontend is built
if [ ! -d "frontend/admin-dashboard/dist" ]; then
  echo "Building frontend..."
  cd frontend/admin-dashboard
  npm ci
  npm run build
  cd ../..
fi

# Activate virtual environment or create it if it doesn't exist
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate

# Install requirements
echo "Installing backend requirements..."
pip install -r backend/requirements.txt
pip install -e .

# Run database migrations if needed
echo "Running database migrations..."
cd backend
alembic upgrade head
cd ..

# Start the unified server
echo "Starting unified server..."
python -m backend.server 