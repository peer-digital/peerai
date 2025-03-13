#!/bin/bash
set -e

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
BACKUP_SCRIPT="$APP_DIR/scripts/backup_db.sh"
CRON_FILE="/tmp/crontab.tmp"

echo "Setting up cron jobs..."

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"

# Create temporary crontab file
crontab -l > "$CRON_FILE" 2>/dev/null || echo "" > "$CRON_FILE"

# Add daily backup job at 2 AM if it doesn't exist
if ! grep -q "backup_db.sh" "$CRON_FILE"; then
    echo "# Daily database backup at 2 AM" >> "$CRON_FILE"
    echo "0 2 * * * $BACKUP_SCRIPT >> $APP_DIR/logs/backup.log 2>&1" >> "$CRON_FILE"
    echo "✅ Added daily database backup job"
else
    echo "Daily database backup job already exists"
fi

# Install new crontab
crontab "$CRON_FILE"
rm "$CRON_FILE"

# Create logs directory
mkdir -p "$APP_DIR/logs"

echo "Cron jobs setup completed successfully!" 