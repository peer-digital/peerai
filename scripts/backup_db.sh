#!/bin/bash
set -e

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
BACKUP_DIR="$APP_DIR/backups"
DB_NAME="peerai_db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/peerai_db_$TIMESTAMP.backup"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup process..."

# Create backup
echo "Creating backup of $DB_NAME database..."
sudo -u postgres pg_dump -Fc "$DB_NAME" > "$BACKUP_FILE"

# Check if backup was successful
if [ -f "$BACKUP_FILE" ]; then
    echo "✅ Backup created successfully: $BACKUP_FILE"
    
    # Create a symlink to the latest backup
    ln -sf "$BACKUP_FILE" "$BACKUP_DIR/latest.backup"
    echo "✅ Symlink to latest backup created: $BACKUP_DIR/latest.backup"
    
    # Keep only the 5 most recent backups
    echo "Cleaning up old backups..."
    ls -t "$BACKUP_DIR"/*.backup | grep -v "latest.backup" | tail -n +6 | xargs -r rm
    echo "✅ Old backups cleaned up"
else
    echo "❌ Backup failed"
    exit 1
fi

echo "Database backup process completed successfully!" 