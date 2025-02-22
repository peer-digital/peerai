#!/bin/bash

# Exit on error
set -e

# Install dependencies
pip install -r requirements.txt

# Run database migrations
echo "Running database migrations..."
export PYTHONPATH=$PYTHONPATH:$(pwd)
alembic upgrade head

echo "Build completed successfully!" 