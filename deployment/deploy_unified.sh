#!/bin/bash
# Deployment script for the unified Peer AI server (frontend + backend + database)

# Stop on error
set -e

# Print commands
set -x

# Configuration
APP_DIR="/home/ubuntu/peer-ai"
SERVICE_NAME="peerai-unified"
POSTGRESQL_SERVICE="postgresql"

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root" >&2
    exit 1
fi

# Ensure PostgreSQL is installed and running
echo "Checking PostgreSQL..."
if ! systemctl is-active --quiet $POSTGRESQL_SERVICE; then
    echo "Installing and configuring PostgreSQL..."
    apt-get update
    apt-get install -y postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql
    
    # Create database and user if not exists
    sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname='peerai'" | grep -q 1 || \
        sudo -u postgres psql -c "CREATE USER peerai WITH PASSWORD 'peerai_password';"
    
    sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='peerai_db'" | grep -q 1 || \
        sudo -u postgres psql -c "CREATE DATABASE peerai_db OWNER peerai;"
fi

# Pull latest code (if using git)
if [ -d "$APP_DIR/.git" ]; then
    echo "Updating from git repository..."
    cd $APP_DIR
    git pull
else
    echo "Not a git repository. Skipping pull."
fi

# Install the systemd service
echo "Installing systemd service..."
cp $APP_DIR/deployment/peerai-unified.service /etc/systemd/system/$SERVICE_NAME.service
systemctl daemon-reload

# Restart the service
echo "Restarting service..."
systemctl restart $SERVICE_NAME
systemctl enable $SERVICE_NAME

# Display service status
echo "Service status:"
systemctl status $SERVICE_NAME --no-pager

echo "Deployment completed successfully!" 