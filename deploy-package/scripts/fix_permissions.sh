#!/bin/bash
set -e

echo "Setting up proper file permissions for the application..."

# Define application directory
APP_DIR="/home/ubuntu/peer-ai"
FRONTEND_DIR="${APP_DIR}/frontend"
BACKEND_DIR="${APP_DIR}/backend"

# Ensure directories exist
mkdir -p ${FRONTEND_DIR}
mkdir -p ${BACKEND_DIR}

# Set ownership
echo "Setting ownership of application files to ubuntu user..."
sudo chown -R ubuntu:ubuntu ${APP_DIR}

# Set proper permissions for files and directories
echo "Setting proper permissions for directories and files..."

# Directories should be executable
find ${APP_DIR} -type d -exec chmod 755 {} \;

# Regular files should be readable
find ${APP_DIR} -type f -exec chmod 644 {} \;

# Scripts should be executable
find ${APP_DIR} -name "*.sh" -exec chmod 755 {} \;
find ${APP_DIR}/scripts -type f -exec chmod 755 {} \;

# Make sure frontend build files are readable by nginx
if [ -d "${FRONTEND_DIR}/dist" ]; then
    echo "Setting permissions for frontend build files..."
    chmod -R 755 ${FRONTEND_DIR}/dist
fi

# Special handling for sensitive files
echo "Setting restrictive permissions for sensitive files..."
if [ -f "${BACKEND_DIR}/.env" ]; then
    chmod 600 ${BACKEND_DIR}/.env
fi

# Set proper permission for Python virtual environment if it exists
if [ -d "${APP_DIR}/venv" ]; then
    echo "Setting permissions for Python virtual environment..."
    chmod -R 755 ${APP_DIR}/venv
fi

echo "File permissions have been set up successfully!" 