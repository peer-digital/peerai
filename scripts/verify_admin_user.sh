#!/bin/bash
set -e

# Define variables
VM_IP="158.174.210.91"
VM_USER="ubuntu"
SSH_KEY_FILE="$HOME/.ssh/peerai_vm_key"

# Check if SSH key exists, if not, set it up
if [ ! -f "$SSH_KEY_FILE" ]; then
    echo "SSH key not found. Setting up SSH key..."
    ./scripts/setup_ssh_key.sh
fi

echo "Verifying admin user on VM at $VM_IP..."

# SSH into the VM and verify admin user
ssh -i "$SSH_KEY_FILE" $VM_USER@$VM_IP << 'EOF'
cd /home/ubuntu/peer-ai/backend
source venv/bin/activate

# Set the correct DATABASE_URL
export DATABASE_URL="postgresql://peerai:peerai_password@localhost:5432/peerai_db"

# Create a Python script to verify admin user
cat > verify_admin.py << 'PYEOF'
from sqlalchemy import create_engine, text
import os
import json

# Get the database URL from environment variable
database_url = os.getenv('DATABASE_URL', 'postgresql://peerai:peerai_password@localhost:5432/peerai_db')

# Create engine
engine = create_engine(database_url)

# Connect to the database
with engine.connect() as connection:
    # Check if admin user exists
    result = connection.execute(
        text("SELECT * FROM users WHERE email = 'admin@example.com'")
    ).fetchone()
    
    if result:
        # Convert row to dict
        user_dict = dict(result._mapping)
        
        # Convert non-serializable types to strings
        for key, value in user_dict.items():
            if not isinstance(value, (str, int, float, bool, type(None))):
                user_dict[key] = str(value)
        
        print("Admin user found:")
        print(json.dumps(user_dict, indent=2))
    else:
        print("Admin user not found")

print("\nVerifying user can login...")
# Check if the password hash is valid
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

with engine.connect() as connection:
    result = connection.execute(
        text("SELECT hashed_password FROM users WHERE email = 'admin@example.com'")
    ).fetchone()
    
    if result:
        hashed_password = result[0]
        is_valid = pwd_context.verify("password", hashed_password)
        print(f"Password verification: {'Success' if is_valid else 'Failed'}")
    else:
        print("Admin user not found")
PYEOF

# Run the Python script
echo "Running admin user verification script..."
python verify_admin.py

# Clean up
rm verify_admin.py
EOF 