#!/bin/bash

# Exit on error
set -e

# Install dependencies
pip install -r requirements.txt

# Run database migrations
echo "Running database migrations..."
export PYTHONPATH=$PYTHONPATH:$(pwd)
alembic upgrade head

# Create admin and test users
echo "Creating admin and test users..."
python scripts/create_admin.py
if [ "$ENVIRONMENT" = "development" ]; then
    echo "Creating test users for development..."
    python scripts/create_test_users.py
fi

echo "Build completed successfully!" 