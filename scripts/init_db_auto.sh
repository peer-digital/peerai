#!/bin/bash
set -e

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
DB_NAME="peerai_db"
DB_USER="peerai"
DB_PASSWORD="peerai_password"  # Added password from deploy.sh

echo "Automatically initializing database with basic data..."

# Check if PostgreSQL is running
if ! systemctl is-active --quiet postgresql; then
    echo "Error: PostgreSQL is not running."
    echo "Starting PostgreSQL..."
    sudo systemctl start postgresql
fi

# Create a temporary SQL file
TMP_SQL_FILE="/tmp/init_db.sql"

# Write SQL commands to the temporary file
cat > "$TMP_SQL_FILE" << EOL
-- Create a default admin user if it doesn't exist
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users') THEN
        RAISE NOTICE 'Table users does not exist yet. Skipping admin user creation.';
    ELSE
        IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com') THEN
            INSERT INTO users (email, hashed_password, is_active, is_superuser, full_name, created_at, updated_at)
            VALUES ('admin@example.com', '\$2b\$12\$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', true, true, 'Admin User', NOW(), NOW());
            RAISE NOTICE 'Created admin user: admin@example.com with password: password';
        ELSE
            RAISE NOTICE 'Admin user already exists.';
        END IF;
    END IF;
END
\$\$;

-- Add any other initialization data here
EOL

# Execute the SQL file - try with peerai user first, fall back to postgres if needed
echo "Executing SQL commands..."
if PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -f "$TMP_SQL_FILE" 2>/dev/null; then
    echo "Successfully executed SQL commands as $DB_USER user."
else
    echo "Could not connect as $DB_USER user, trying with postgres user..."
    # Try with sudo to postgres user as fallback
    sudo -u postgres psql -d "$DB_NAME" -f "$TMP_SQL_FILE"
fi

# Remove the temporary SQL file
rm "$TMP_SQL_FILE"

echo "Database initialization completed successfully!"
echo "Default admin credentials (if users table exists):"
echo "Email: admin@example.com"
echo "Password: password"
echo "Note: You should change this password immediately after first login." 