#!/bin/bash
set -e

# Define variables
APP_DIR="/home/ubuntu/peer-ai"

echo "Fixing permissions for files in $APP_DIR..."

# Check if the directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "Error: Directory $APP_DIR does not exist."
    exit 1
fi

# Fix ownership of the entire directory
echo "Setting ownership of $APP_DIR to ubuntu:ubuntu..."
sudo chown -R ubuntu:ubuntu "$APP_DIR"

# Fix permissions for directories
echo "Setting permissions for directories..."
find "$APP_DIR" -type d -exec sudo chmod 755 {} \;

# Fix permissions for files
echo "Setting permissions for files..."
find "$APP_DIR" -type f -exec sudo chmod 644 {} \;

# Make scripts executable
echo "Making scripts executable..."
find "$APP_DIR/scripts" -name "*.sh" -exec sudo chmod +x {} \;

# Special handling for the backup file
if [ -f "$APP_DIR/server_dump.backup" ]; then
    echo "Setting permissions for backup file..."
    sudo chmod 644 "$APP_DIR/server_dump.backup"
    ls -la "$APP_DIR/server_dump.backup"
fi

echo "Permissions fixed successfully!" 