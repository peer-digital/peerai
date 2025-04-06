#!/bin/bash

# sync_db.sh - Simple script to sync the database schema
# This script is a wrapper around the sync_database.py script

# Exit on error
set -e

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$BACKEND_DIR")"

# Set PYTHONPATH to include the project root
export PYTHONPATH=$PYTHONPATH:$PROJECT_ROOT

# Check if .env file exists and load it
ENV_FILE="$BACKEND_DIR/.env"
if [ -f "$ENV_FILE" ]; then
    echo "Loading environment variables from $ENV_FILE"
    set -a
    source "$ENV_FILE"
    set +a
else
    echo "No .env file found at $ENV_FILE"
    echo "Make sure DATABASE_URL is set in your environment"
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set."
    echo "Please set the DATABASE_URL environment variable or create a .env file with it."
    echo "Example: DATABASE_URL=postgresql://peerai:peerai_password@localhost:5432/peerai_db"
    exit 1
fi

# Run the Python script
echo "🚀 Running database schema synchronization..."
python "$SCRIPT_DIR/sync_database.py"

# Exit with the same status as the Python script
exit $?
