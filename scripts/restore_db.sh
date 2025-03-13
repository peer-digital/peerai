#!/bin/bash
set -e

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
BACKUP_FILE="$APP_DIR/server_dump.backup"
DB_NAME="peerai_db"
DB_USER="peerai"

echo "Starting database restoration process..."

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found at $BACKUP_FILE"
    exit 1
fi

# Fix permissions on the backup file
echo "Setting correct permissions on backup file..."
sudo chown ubuntu:ubuntu "$BACKUP_FILE"
sudo chmod 644 "$BACKUP_FILE"

# Verify the backup file is readable
if [ ! -r "$BACKUP_FILE" ]; then
    echo "Error: Backup file exists but is not readable. Check permissions."
    ls -la "$BACKUP_FILE"
    exit 1
fi

# Restore database
echo "Restoring database from backup..."
sudo -u postgres pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DB_NAME" "$BACKUP_FILE"

# Grant privileges to application user
echo "Granting privileges to application user..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;"

echo "Database restoration completed successfully!" 