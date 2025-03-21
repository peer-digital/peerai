#!/bin/bash
set -e

echo "=== EMERGENCY DATABASE FIX ==="
echo "Date: $(date)"
echo "User: $(whoami)"
echo ""

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
SCRIPTS_DIR="$APP_DIR/scripts"
SQL_FILE="$SCRIPTS_DIR/emergency_db_fix.sql"

# Check if we're on the VM
if [[ "$(hostname)" != *"ubuntu"* ]] && [[ "$(whoami)" != "ubuntu" ]]; then
    echo "This script must be run on the VM."
    echo "Please connect to the VM first using ./scripts/connect_to_vm.sh"
    exit 1
fi

# Check if the SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo "Error: SQL file not found at $SQL_FILE"
    echo "Creating emergency SQL file..."
    
    # Create the SQL file if it doesn't exist
    cat > "$SQL_FILE" << 'EOF'
-- Emergency database fix script for constraint and migration issues
-- To run: psql -U peerai -h localhost -d peerai_db -f emergency_db_fix.sql

-- Start a transaction
BEGIN;

-- Check if the constraint exists and drop it if it does
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_referrals_referee_id'
    ) THEN
        EXECUTE 'ALTER TABLE referrals DROP CONSTRAINT uq_referrals_referee_id';
        RAISE NOTICE 'Dropped constraint uq_referrals_referee_id';
    ELSE
        RAISE NOTICE 'Constraint uq_referrals_referee_id does not exist';
    END IF;
END $$;

-- Check if users table exists but doesn't have the email verification fields
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'users'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email_verified'
    ) THEN
        -- Add the email verification fields
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE users ADD COLUMN verification_token VARCHAR(255);
        ALTER TABLE users ADD COLUMN verification_token_expires_at TIMESTAMP;
        RAISE NOTICE 'Added email verification fields to users table';
    ELSE
        RAISE NOTICE 'Email verification fields already exist or users table does not exist';
    END IF;
END $$;

-- Make sure alembic_version table exists and contains the right version
DO $$
BEGIN
    -- Create alembic_version table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'alembic_version'
    ) THEN
        CREATE TABLE alembic_version (
            version_num VARCHAR(32) NOT NULL,
            PRIMARY KEY (version_num)
        );
        INSERT INTO alembic_version (version_num) VALUES ('16e5e60f9836');
        RAISE NOTICE 'Created alembic_version table with version 16e5e60f9836';
    ELSE
        -- Update existing alembic_version
        DELETE FROM alembic_version;
        INSERT INTO alembic_version (version_num) VALUES ('16e5e60f9836');
        RAISE NOTICE 'Updated alembic_version to 16e5e60f9836';
    END IF;
END $$;

-- Commit all changes
COMMIT;

-- Print final status
DO $$
BEGIN
    RAISE NOTICE 'Emergency database fix completed successfully';
    RAISE NOTICE 'Migration version set to 16e5e60f9836';
    RAISE NOTICE 'Constraint uq_referrals_referee_id has been removed if it existed';
END $$;
EOF
fi

# Ensure the SQL file is readable
chmod +r "$SQL_FILE"

echo "Running emergency database fix script..."
PGPASSWORD=peerai_password psql -U peerai -h localhost -d peerai_db -f "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Emergency database fix completed successfully!"
else
    echo "⚠️ Emergency database fix had issues."
    
    # Try super user access as a last resort
    echo "Attempting with superuser privileges..."
    sudo -u postgres psql -d peerai_db -f "$SQL_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ Emergency database fix with superuser privileges completed successfully!"
    else
        echo "❌ Emergency database fix failed even with superuser privileges."
        exit 1
    fi
fi

echo "=== Emergency Fix Complete ===" 