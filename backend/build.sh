#!/bin/bash

# Exit on error
set -e

# Install dependencies
pip install -r requirements.txt

# Run database migrations
echo "Running database migrations..."
export PYTHONPATH=$PYTHONPATH:$(pwd)
alembic upgrade head

# Create admin user
echo "Creating admin user..."
python scripts/create_admin.py

# Verify database
echo "Verifying database..."
python scripts/verify_db.py

echo "Build completed successfully!" 