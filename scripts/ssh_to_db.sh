#!/bin/bash
set -e

echo "=== SSH to Database Tool ==="
echo "Running on: $(hostname)"
echo "Date: $(date)"
echo "User: $(whoami)"
echo ""

# Define variables
VM_IP="158.174.210.91"
VM_USER="ubuntu"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH_DIR="$HOME/.ssh"
SSH_KEY_FILE="$SSH_DIR/peer_ai_vm_key"  # Use the dedicated key for this VM

# Check if we're already on the VM
if [[ "$(hostname)" == *"ubuntu"* ]] || [[ "$(whoami)" == "ubuntu" ]]; then
    echo "Already on the VM, running database tests directly..."
    
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
    
    # Create a Python script to test the database connection
    echo "Creating database test script..."
    cat > "$BACKEND_DIR/test_db.py" << 'EOF'
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
        
        # List all tables
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"Tables in database: {len(tables)}")
        for table in sorted(tables):
            print(f"  - {table}")
            
            # For the referrals table, show constraints
            if table == 'referrals':
                print("    Constraints for referrals table:")
                try:
                    constraints = inspector.get_unique_constraints('referrals')
                    if constraints:
                        for constraint in constraints:
                            print(f"      - {constraint['name']}: {constraint['column_names']}")
                    else:
                        print("      No unique constraints found")
                except Exception as e:
                    print(f"      Error getting constraints: {e}")
            
            # For the users table, show columns
            if table == 'users':
                print("    Columns for users table:")
                columns = inspector.get_columns('users')
                for column in columns:
                    print(f"      - {column['name']}: {column['type']}")
        
        # Check if the problematic constraint exists
        print("\nChecking for problematic constraint:")
        result = conn.execute(text(
            "SELECT COUNT(*) FROM pg_constraint WHERE conname = 'uq_referrals_referee_id'"
        )).fetchone()
        
        if result[0] > 0:
            print("❌ Constraint 'uq_referrals_referee_id' still exists")
        else:
            print("✅ Constraint 'uq_referrals_referee_id' does not exist")
        
        # Check if email verification fields exist
        print("\nChecking for email verification fields:")
        users_columns = [col['name'] for col in inspector.get_columns('users')]
        
        if 'email_verified' in users_columns:
            print("✅ Column 'email_verified' exists in users table")
        else:
            print("❌ Column 'email_verified' does not exist in users table")
        
        if 'verification_token' in users_columns:
            print("✅ Column 'verification_token' exists in users table")
        else:
            print("❌ Column 'verification_token' does not exist in users table")
        
        if 'verification_token_expires_at' in users_columns:
            print("✅ Column 'verification_token_expires_at' exists in users table")
        else:
            print("❌ Column 'verification_token_expires_at' does not exist in users table")
    
    print("\nDatabase test completed successfully")
    sys.exit(0)
except Exception as e:
    print(f"Error: {str(e)}")
    sys.exit(1)
EOF
    
    # Run the Python script
    echo "Running database test script..."
    cd "$BACKEND_DIR"
    python test_db.py
    
    if [ $? -eq 0 ]; then
        echo "✅ Database test completed successfully!"
    else
        echo "❌ Database test failed."
        exit 1
    fi
    
    # Clean up
    echo "Cleaning up..."
    rm -f "$BACKEND_DIR/test_db.py"
    
    echo "=== Database Test Complete ==="
    
    # Connect to PostgreSQL directly
    echo ""
    echo "=== Connecting to PostgreSQL directly ==="
    echo "Enter 'exit' to quit the PostgreSQL shell"
    echo ""
    
    # Connect to the database
    PGPASSWORD=peerai_password psql -h localhost -U peerai -d peerai_db
else
    # We're running locally, so SSH into the VM first
    echo "Running on local machine, SSHing into VM at $VM_IP..."
    
    # First, ensure we have the correct SSH key setup
    echo "Setting up SSH keys..."
    
    # Check if the connection script exists and is executable
    if [ ! -f "$SCRIPT_DIR/connect_to_vm.sh" ]; then
        echo "Error: Connection script not found at $SCRIPT_DIR/connect_to_vm.sh"
        exit 1
    fi
    
    # Make the connection script executable if it's not already
    chmod +x "$SCRIPT_DIR/connect_to_vm.sh"
    
    # Run the connection script to set up the SSH key
    "$SCRIPT_DIR/connect_to_vm.sh"
    
    # If the connection script was successful, the user should now be connected to the VM
    # If they chose not to connect, we'll continue with our own connection
    
    # Check if the SSH key file exists
    if [ ! -f "$SSH_KEY_FILE" ]; then
        echo "Error: SSH key file not found at $SSH_KEY_FILE"
        echo "Please run the connection script first: $SCRIPT_DIR/connect_to_vm.sh"
        exit 1
    fi
    
    # Create a temporary script to run on the VM
    TMP_SCRIPT=$(mktemp)
    cat > "$TMP_SCRIPT" << 'EOF'
#!/bin/bash
set -e

echo "=== Database Test on VM ==="
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

# Create a Python script to test the database connection
echo "Creating database test script..."
cat > "$BACKEND_DIR/test_db.py" << 'EOFPY'
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
        
        # List all tables
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"Tables in database: {len(tables)}")
        for table in sorted(tables):
            print(f"  - {table}")
            
            # For the referrals table, show constraints
            if table == 'referrals':
                print("    Constraints for referrals table:")
                try:
                    constraints = inspector.get_unique_constraints('referrals')
                    if constraints:
                        for constraint in constraints:
                            print(f"      - {constraint['name']}: {constraint['column_names']}")
                    else:
                        print("      No unique constraints found")
                except Exception as e:
                    print(f"      Error getting constraints: {e}")
            
            # For the users table, show columns
            if table == 'users':
                print("    Columns for users table:")
                columns = inspector.get_columns('users')
                for column in columns:
                    print(f"      - {column['name']}: {column['type']}")
        
        # Check if the problematic constraint exists
        print("\nChecking for problematic constraint:")
        result = conn.execute(text(
            "SELECT COUNT(*) FROM pg_constraint WHERE conname = 'uq_referrals_referee_id'"
        )).fetchone()
        
        if result[0] > 0:
            print("❌ Constraint 'uq_referrals_referee_id' still exists")
        else:
            print("✅ Constraint 'uq_referrals_referee_id' does not exist")
        
        # Check if email verification fields exist
        print("\nChecking for email verification fields:")
        users_columns = [col['name'] for col in inspector.get_columns('users')]
        
        if 'email_verified' in users_columns:
            print("✅ Column 'email_verified' exists in users table")
        else:
            print("❌ Column 'email_verified' does not exist in users table")
        
        if 'verification_token' in users_columns:
            print("✅ Column 'verification_token' exists in users table")
        else:
            print("❌ Column 'verification_token' does not exist in users table")
        
        if 'verification_token_expires_at' in users_columns:
            print("✅ Column 'verification_token_expires_at' exists in users table")
        else:
            print("❌ Column 'verification_token_expires_at' does not exist in users table")
    
    print("\nDatabase test completed successfully")
    sys.exit(0)
except Exception as e:
    print(f"Error: {str(e)}")
    sys.exit(1)
EOFPY

# Run the Python script
echo "Running database test script..."
cd "$BACKEND_DIR"
python test_db.py

if [ $? -eq 0 ]; then
    echo "✅ Database test completed successfully!"
else
    echo "❌ Database test failed."
    exit 1
fi

# Clean up
echo "Cleaning up..."
rm -f "$BACKEND_DIR/test_db.py"

echo "=== Database Test Complete ==="

# Connect to PostgreSQL directly
echo ""
echo "=== Connecting to PostgreSQL directly ==="
echo "Enter 'exit' to quit the PostgreSQL shell"
echo ""

# Connect to the database
PGPASSWORD=peerai_password psql -h localhost -U peerai -d peerai_db
EOF
    
    # Make the script executable
    chmod +x "$TMP_SCRIPT"
    
    # Copy the script to the VM and execute it
    echo "Copying and executing database test script on VM..."
    scp -i "$SSH_KEY_FILE" -o IdentitiesOnly=yes -o StrictHostKeyChecking=no "$TMP_SCRIPT" $VM_USER@$VM_IP:/tmp/db_test.sh
    ssh -i "$SSH_KEY_FILE" -o IdentitiesOnly=yes -o StrictHostKeyChecking=no $VM_USER@$VM_IP "chmod +x /tmp/db_test.sh && /tmp/db_test.sh"
    
    # Clean up the temporary script
    rm -f "$TMP_SCRIPT"
fi 