#!/bin/bash
set -e

echo "=== Database Constraint Check Tool ==="
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

echo "Creating database check script..."
cat > "$BACKEND_DIR/check_db.py" << 'EOF'
"""Script to check database state and constraints."""

import os
import sys
from sqlalchemy import create_engine, text, inspect

# Get the database URL from environment or use default
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://peerai:peerai_password@localhost:5432/peerai_db')

def check_database():
    """Check database structure and constraints."""
    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        inspector = inspect(engine)
        
        # Connect to database
        with engine.connect() as conn:
            print("Database connection successful")
            
            # Get current migration version
            result = conn.execute(text("SELECT version_num FROM alembic_version")).fetchone()
            current_version = result[0] if result else "No version found"
            print(f"Current migration version: {current_version}")
            
            # List all tables
            tables = inspector.get_table_names()
            print(f"Tables in database: {len(tables)}")
            for table in sorted(tables):
                print(f"  - {table}")
                
                # For specific tables, show more details
                if table in ['referrals', 'users']:
                    print(f"    Columns for {table} table:")
                    columns = inspector.get_columns(table)
                    for column in columns:
                        print(f"      - {column['name']}: {column['type']}")
                    
                    print(f"    Constraints for {table} table:")
                    try:
                        # Get foreign keys
                        fkeys = inspector.get_foreign_keys(table)
                        if fkeys:
                            for fkey in fkeys:
                                print(f"      - Foreign Key: {fkey['constrained_columns']} -> {fkey['referred_table']}.{fkey['referred_columns']}")
                        else:
                            print("      No foreign keys found")
                            
                        # Get unique constraints
                        uconstraints = inspector.get_unique_constraints(table)
                        if uconstraints:
                            for uconstraint in uconstraints:
                                print(f"      - Unique Constraint: {uconstraint['name']} on columns {uconstraint['column_names']}")
                        else:
                            print("      No unique constraints found")
                            
                        # Get primary key constraints
                        pkeys = inspector.get_pk_constraint(table)
                        print(f"      - Primary Key: {pkeys['name']} on columns {pkeys['constrained_columns']}")
                        
                    except Exception as e:
                        print(f"      Error getting constraints: {e}")
            
            # Check explicitly for the problematic constraint
            print("\nChecking for problematic constraint 'uq_referrals_referee_id'...")
            result = conn.execute(text(
                "SELECT COUNT(*) FROM pg_constraint WHERE conname = 'uq_referrals_referee_id'"
            )).scalar()
            
            if result > 0:
                print("⚠️ Constraint 'uq_referrals_referee_id' EXISTS - this may cause issues during migrations.")
            else:
                print("✅ Constraint 'uq_referrals_referee_id' does NOT exist - no conflict expected.")
            
        return True
    
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    success = check_database()
    sys.exit(0 if success else 1)
EOF

echo "Running database check script..."
cd "$BACKEND_DIR"
source venv/bin/activate
python check_db.py

if [ $? -eq 0 ]; then
    echo "✅ Database check completed successfully."
else
    echo "❌ Database check failed."
    exit 1
fi

echo "=== Check Complete ===" 