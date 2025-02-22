#!/bin/bash

# Exit on error
set -e

# Install dependencies
pip install -r requirements.txt

# Run database migrations
echo "Running database migrations..."
cd backend
alembic upgrade head

echo "Build completed successfully!" 