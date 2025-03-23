#!/bin/bash

# Exit on error
set -e

# Install dependencies
pip install -r requirements.txt

# Run database migrations
echo "Running database migrations..."
export PYTHONPATH=$PYTHONPATH:$(pwd)

# First, stamp the current version to ensure we're in a known state
echo "Stamping current version..."
alembic stamp head || true

# Then run the migrations
echo "Running migrations..."
alembic upgrade head

# Create admin and test users
echo "Creating admin and test users..."
python scripts/create_admin.py
if [ "$ENVIRONMENT" = "development" ]; then
    echo "Creating test users for development..."
    python scripts/create_test_users.py
fi

echo "Build completed successfully!" 