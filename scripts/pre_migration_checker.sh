#!/bin/bash
set -e

echo "=== Pre-Migration Check Tool ==="
echo "Date: $(date)"
echo "User: $(whoami)"
echo ""

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
BACKEND_DIR="$APP_DIR/backend"

# Check if we're on the VM
if [[ "$(hostname)" != *"ubuntu"* ]] && [[ "$(whoami)" != "ubuntu" ]]; then
    echo "This script must be run on the VM."
    echo "Please connect to the VM first using ./scripts/connect_to_vm.sh"
    exit 1
fi

# Check if the backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "Error: Backend directory not found at $BACKEND_DIR"
    exit 1
fi

echo "Creating pre-migration check script..."
cat > "$BACKEND_DIR/pre_migration_check.py" << 'EOF'
"""Script to check and fix potential issues before running migrations."""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.engine.reflection import Inspector
from sqlalchemy.exc import ProgrammingError

# Get the database URL from environment or use default
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://peerai:peerai_password@localhost:5432/peerai_db')

KNOWN_PROBLEMATIC_CONSTRAINTS = [
    {
        'name': 'uq_referrals_referee_id',
        'table': 'referrals'
    },
    {
        'name': 'uq_users_referral_code',
        'table': 'users'
    }
]


def check_and_fix_issues():
    """Check for known issues and fix them before migrations run."""
    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        inspector = inspect(engine)
        
        # Connect to database
        with engine.connect() as conn:
            print("Database connection successful")
            
            # Get list of tables
            tables = inspector.get_table_names()
            print(f"Tables in database: {len(tables)}")
            
            # Check each known problematic constraint
            for constraint_info in KNOWN_PROBLEMATIC_CONSTRAINTS:
                constraint_name = constraint_info['name']
                table_name = constraint_info['table']
                
                # Skip if table doesn't exist
                if table_name not in tables:
                    print(f"Table '{table_name}' doesn't exist, skipping constraint check")
                    continue
                
                print(f"Checking for constraint '{constraint_name}' on table '{table_name}'...")
                
                # Check if constraint exists in pg_constraint
                result = conn.execute(text(
                    "SELECT COUNT(*) FROM pg_constraint WHERE conname = :constraint_name"
                ), {"constraint_name": constraint_name}).scalar()
                
                if result > 0:
                    print(f"Found constraint '{constraint_name}', dropping it...")
                    try:
                        conn.execute(text(
                            f"ALTER TABLE {table_name} DROP CONSTRAINT {constraint_name}"
                        ))
                        conn.commit()
                        print(f"✅ Successfully dropped constraint '{constraint_name}'")
                    except ProgrammingError as e:
                        print(f"⚠️ Error dropping constraint: {e}")
                else:
                    print(f"✅ Constraint '{constraint_name}' doesn't exist, no action needed")
            
            # Confirm current migration state
            try:
                result = conn.execute(text("SELECT version_num FROM alembic_version")).fetchone()
                current_version = result[0] if result else "No version found"
                print(f"Current migration version: {current_version}")
            except Exception as e:
                print(f"Error checking migration version: {e}")
                
        return True
    
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    success = check_and_fix_issues()
    sys.exit(0 if success else 1)
EOF

echo "Running pre-migration check script..."
cd "$BACKEND_DIR"
source venv/bin/activate
python pre_migration_check.py

if [ $? -eq 0 ]; then
    echo "✅ Pre-migration check completed successfully."
else
    echo "❌ Pre-migration check failed."
    exit 1
fi

echo "=== Pre-Migration Check Complete ===" 