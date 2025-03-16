#!/bin/bash
set -e

# Define paths
APP_DIR="/home/ubuntu/peer-ai"
LOG_DIR="$APP_DIR/logs"
BACKUP_DIR="$APP_DIR/backups"
TEMP_DIR="/home/ubuntu/deployment"

echo "Starting post-deployment cleanup..."

# Create directories if they don't exist
mkdir -p "$LOG_DIR"
mkdir -p "$BACKUP_DIR"

# Backup the database
echo "Creating database backup..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/peerai_db_$TIMESTAMP.sql"
sudo -u postgres pg_dump peerai_db > "$BACKUP_FILE"
gzip "$BACKUP_FILE"
echo "Database backup created: ${BACKUP_FILE}.gz"

# Rotate database backups (keep last 7)
echo "Rotating database backups..."
ls -t "$BACKUP_DIR"/*.sql.gz | tail -n +8 | xargs rm -f

# Cleanup old logs (keep last 7 days)
echo "Cleaning up old logs..."
find "$LOG_DIR" -name "*.log" -type f -mtime +7 -delete

# Remove temporary files
echo "Removing temporary files..."
find "$APP_DIR" -name "*.tmp" -type f -delete
find "$APP_DIR" -name "*.bak" -type f -delete

# Clean npm cache in frontend directory
if [ -d "$APP_DIR/frontend" ]; then
  echo "Cleaning frontend build cache..."
  rm -rf "$APP_DIR/frontend/.cache"
  rm -rf "$APP_DIR/frontend/node_modules/.cache"
fi

# Clean Python cache files
echo "Cleaning Python cache files..."
find "$APP_DIR" -name "__pycache__" -type d -exec rm -rf {} +
find "$APP_DIR" -name "*.pyc" -type f -delete

# Clean deployment artifacts
echo "Cleaning deployment artifacts..."
rm -rf "$TEMP_DIR/frontend-build.tar.gz"
rm -rf "$TEMP_DIR/scripts.tar.gz"

# Set proper permissions
echo "Setting proper permissions..."
sudo chown -R ubuntu:ubuntu "$APP_DIR"
sudo chmod -R 755 "$APP_DIR/scripts"

echo "Cleaning systemd journal..."
sudo journalctl --vacuum-time=7d

echo "Cleanup completed successfully!" 