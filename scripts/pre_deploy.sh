#!/bin/bash
set -e

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
FRONTEND_DIR="$APP_DIR/frontend"
BACKEND_DIR="$APP_DIR/backend"

echo "Starting pre-deployment preparation..."

# Create necessary directories
mkdir -p "$APP_DIR"
mkdir -p "$FRONTEND_DIR"
mkdir -p "$BACKEND_DIR"
mkdir -p "$APP_DIR/logs"
mkdir -p "$APP_DIR/backups"

# Ensure required packages are installed
echo "Ensuring required packages are installed..."
sudo apt-get update
sudo apt-get install -y python3-venv python3-pip nginx postgresql postgresql-contrib git

# Check if PostgreSQL is running
echo "Checking PostgreSQL status..."
if ! systemctl is-active --quiet postgresql; then
    echo "Starting PostgreSQL..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# Check if Nginx is running
echo "Checking Nginx status..."
if ! systemctl is-active --quiet nginx; then
    echo "Starting Nginx..."
    sudo systemctl start nginx
    sudo systemctl enable nginx
fi

# Set proper ownership
echo "Setting proper ownership..."
sudo chown -R ubuntu:ubuntu "$APP_DIR"

# Stop services that will be updated
echo "Stopping services before deployment..."
sudo systemctl stop peerai.service || echo "Service not running, continuing..."

# Backup the current database
echo "Backing up current database..."
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "peerai_db"; then
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="$APP_DIR/backups/peerai_db_pre_deploy_$TIMESTAMP.sql"
    sudo -u postgres pg_dump peerai_db > "$BACKUP_FILE"
    gzip "$BACKUP_FILE"
    echo "Database backup created: ${BACKUP_FILE}.gz"
else
    echo "Database does not exist yet, skipping backup"
fi

# Create a symbolic link for the backend if needed (for legacy paths)
if [ ! -L "$APP_DIR/api" ] && [ ! -d "$APP_DIR/api" ]; then
    echo "Creating symbolic link for backend..."
    ln -s "$BACKEND_DIR" "$APP_DIR/api"
fi

echo "Pre-deployment preparation completed successfully!" 