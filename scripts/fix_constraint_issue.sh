#!/bin/bash
set -e

echo "=== Constraint Fix Tool ==="
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

echo "Creating direct SQL fix script..."
cat > "$BACKEND_DIR/fix_constraint.py" << 'EOF'
"""Script to directly fix the constraint issue in the database."""

import os
import sys
from sqlalchemy import create_engine, text

# Get the database URL from environment or use default
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://peerai:peerai_password@localhost:5432/peerai_db')

def fix_constraint_issue():
    """Fix the constraint issue by checking if it exists before attempting to drop it."""
    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        # Connect to database
        with engine.connect() as conn:
            print("Database connection successful")
            
            # Check if the constraint exists
            print("Checking if constraint 'uq_referrals_referee_id' exists...")
            result = conn.execute(text(
                "SELECT COUNT(*) FROM pg_constraint WHERE conname = 'uq_referrals_referee_id'"
            )).scalar()
            
            if result > 0:
                print("Constraint exists, dropping it...")
                conn.execute(text("ALTER TABLE referrals DROP CONSTRAINT uq_referrals_referee_id"))
                print("Constraint dropped successfully.")
            else:
                print("Constraint 'uq_referrals_referee_id' does not exist, nothing to drop.")
            
            # Mark the migration as complete in alembic_version
            print("Checking current migration version...")
            result = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
            print(f"Current migration version: {result}")
            
            # Commit the transaction
            conn.commit()
            
        print("Database fix completed successfully.")
        return True
    
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    success = fix_constraint_issue()
    sys.exit(0 if success else 1)
EOF

echo "Running fix script..."
cd "$BACKEND_DIR"
source venv/bin/activate
python fix_constraint.py

if [ $? -eq 0 ]; then
    echo "✅ Constraint fix completed successfully!"
else
    echo "❌ Constraint fix failed."
    exit 1
fi

echo "=== Fix Complete ===" 