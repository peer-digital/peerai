#!/bin/bash
set -e

echo "=== Database Migration Fix Tool ==="
echo "Running on: $(hostname)"
echo "Date: $(date)"
echo "User: $(whoami)"
echo ""

APP_DIR="/home/ubuntu/peer-ai"
BACKEND_DIR="$APP_DIR/backend"
VENV_DIR="$BACKEND_DIR/venv"

# Check if the backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "Error: Backend directory not found at $BACKEND_DIR"
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# Create a Python script to fix the migration issue
echo "Creating migration fix script..."
cat > "$BACKEND_DIR/fix_migration.py" << 'EOF'
from sqlalchemy import create_engine, text, inspect
import os
import sys

# Get the database URL from environment variable or use default
database_url = os.getenv('DATABASE_URL', 'postgresql://peerai:peerai_password@localhost:5432/peerai_db')

print(f"Connecting to database: {database_url.split('@')[1] if '@' in database_url else database_url}")

try:
    # Create engine
    engine = create_engine(database_url)
    
    # Check connection
    with engine.connect() as conn:
        print("Database connection successful")
        
        # Get current migration version
        result = conn.execute(text("SELECT version_num FROM alembic_version")).fetchone()
        current_version = result[0] if result else "No version found"
        print(f"Current migration version: {current_version}")
        
        # Check if we're at the problematic migration
        if current_version == "add_referral_system":
            print("Found problematic migration version. Fixing...")
            
            # Check if referrals table exists
            inspector = inspect(engine)
            if "referrals" in inspector.get_table_names():
                print("Referrals table exists")
                
                # Check if constraint exists
                with conn.begin():
                    result = conn.execute(text(
                        "SELECT COUNT(*) FROM pg_constraint WHERE conname = 'uq_referrals_referee_id'"
                    )).fetchone()
                    
                    if result[0] > 0:
                        print("Constraint 'uq_referrals_referee_id' exists, dropping it")
                        conn.execute(text("ALTER TABLE referrals DROP CONSTRAINT uq_referrals_referee_id"))
                    else:
                        print("Constraint 'uq_referrals_referee_id' does not exist, skipping")
                    
                    # Add email verification fields to users table
                    print("Adding email verification fields to users table")
                    
                    # Check if columns already exist
                    users_columns = [col['name'] for col in inspector.get_columns('users')]
                    
                    if 'email_verified' not in users_columns:
                        print("Adding 'email_verified' column")
                        conn.execute(text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE"))
                    
                    if 'verification_token' not in users_columns:
                        print("Adding 'verification_token' column")
                        conn.execute(text("ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)"))
                    
                    if 'verification_token_expires_at' not in users_columns:
                        print("Adding 'verification_token_expires_at' column")
                        conn.execute(text("ALTER TABLE users ADD COLUMN verification_token_expires_at TIMESTAMP"))
                    
                    # Update alembic version to skip the problematic migration
                    print("Updating alembic version to '16e5e60f9836'")
                    conn.execute(text("UPDATE alembic_version SET version_num = '16e5e60f9836'"))
            else:
                print("Referrals table does not exist, creating it with the correct schema")
                with conn.begin():
                    # Create referrals table with the correct schema
                    conn.execute(text("""
                        CREATE TABLE referrals (
                            id SERIAL PRIMARY KEY,
                            referrer_id INTEGER NOT NULL,
                            referee_id INTEGER,
                            referral_code VARCHAR(255) NOT NULL,
                            status VARCHAR(50) NOT NULL DEFAULT 'pending',
                            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
                        )
                    """))
                    
                    # Add email verification fields to users table
                    print("Adding email verification fields to users table")
                    
                    # Check if columns already exist
                    users_columns = [col['name'] for col in inspector.get_columns('users')]
                    
                    if 'email_verified' not in users_columns:
                        print("Adding 'email_verified' column")
                        conn.execute(text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE"))
                    
                    if 'verification_token' not in users_columns:
                        print("Adding 'verification_token' column")
                        conn.execute(text("ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)"))
                    
                    if 'verification_token_expires_at' not in users_columns:
                        print("Adding 'verification_token_expires_at' column")
                        conn.execute(text("ALTER TABLE users ADD COLUMN verification_token_expires_at TIMESTAMP"))
                    
                    # Update alembic version to skip the problematic migration
                    print("Updating alembic version to '16e5e60f9836'")
                    conn.execute(text("UPDATE alembic_version SET version_num = '16e5e60f9836'"))
            
            print("Fix completed successfully")
        else:
            print(f"Not at the problematic migration version (current: {current_version})")
            print("Checking if we need to fix the constraint anyway...")
            
            # Check if referrals table exists
            inspector = inspect(engine)
            if "referrals" in inspector.get_table_names():
                print("Referrals table exists")
                
                # Check if constraint exists
                with conn.begin():
                    result = conn.execute(text(
                        "SELECT COUNT(*) FROM pg_constraint WHERE conname = 'uq_referrals_referee_id'"
                    )).fetchone()
                    
                    if result[0] > 0:
                        print("Constraint 'uq_referrals_referee_id' exists, dropping it")
                        conn.execute(text("ALTER TABLE referrals DROP CONSTRAINT uq_referrals_referee_id"))
                    else:
                        print("Constraint 'uq_referrals_referee_id' does not exist, skipping")
            else:
                print("Referrals table does not exist, no fix needed")
    
    print("Migration fix script completed successfully")
    sys.exit(0)
except Exception as e:
    print(f"Error: {str(e)}")
    sys.exit(1)
EOF

# Run the Python script
echo "Running migration fix script..."
cd "$BACKEND_DIR"
python fix_migration.py

if [ $? -eq 0 ]; then
    echo "✅ Migration fix script completed successfully!"
else
    echo "❌ Migration fix script failed."
    exit 1
fi

# Run migrations to continue from the fixed point
echo "Running remaining migrations..."
cd "$BACKEND_DIR"
alembic upgrade head

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully!"
else
    echo "❌ Migrations failed."
    exit 1
fi

# Clean up
echo "Cleaning up..."
rm -f "$BACKEND_DIR/fix_migration.py"

echo "=== Database Migration Fix Complete ===" 