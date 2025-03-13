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

echo "Creating admin user on VM at $VM_IP..."

# SSH into the VM and create admin user
ssh -i "$SSH_KEY_FILE" $VM_USER@$VM_IP << 'EOF'
cd /home/ubuntu/peer-ai/backend
source venv/bin/activate

# Set the correct DATABASE_URL
export DATABASE_URL="postgresql://peerai:peerai_password@localhost:5432/peerai_db"

# First, let's check the structure of the users table
echo "Checking users table structure..."
sudo -u postgres psql -d peerai_db -c "\d users"

# Create a Python script to create admin user
cat > create_admin.py << 'PYEOF'
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
import os
import sys
from datetime import datetime

# Get the database URL from environment variable
database_url = os.getenv('DATABASE_URL', 'postgresql://peerai:peerai_password@localhost:5432/peerai_db')

# Create engine
engine = create_engine(database_url)
Session = sessionmaker(bind=engine)
session = Session()

# Get column names from users table
inspector = inspect(engine)
columns = [column['name'] for column in inspector.get_columns('users')]
print("Available columns in users table:", columns)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Check if admin user already exists
admin_exists = session.execute(
    text("SELECT COUNT(*) FROM users WHERE email = 'admin@example.com'")
).fetchone()[0]

if admin_exists:
    print("Admin user already exists")
    sys.exit(0)

# Create admin user
hashed_password = pwd_context.hash("password")
now = datetime.utcnow()

# Build the SQL dynamically based on available columns
column_names = []
column_values = []
params = {
    "email": "admin@example.com",
    "hashed_password": hashed_password,
    "full_name": "Admin User",
    "created_at": now,
}

# Add columns if they exist
if "is_active" in columns:
    column_names.append("is_active")
    column_values.append(":is_active")
    params["is_active"] = True

if "email_verified" in columns:
    column_names.append("email_verified")
    column_values.append(":email_verified")
    params["email_verified"] = True

if "role" in columns:
    column_names.append("role")
    column_values.append(":role")
    params["role"] = "SUPER_ADMIN"

if "token_limit" in columns:
    column_names.append("token_limit")
    column_values.append(":token_limit")
    params["token_limit"] = 10000

# Build the SQL statement
sql = f"""
INSERT INTO users (
    email, hashed_password, full_name, created_at{', ' + ', '.join(column_names) if column_names else ''}
) VALUES (
    :email, :hashed_password, :full_name, :created_at{', ' + ', '.join(column_values) if column_values else ''}
)
"""

print("Executing SQL:", sql)
session.execute(text(sql), params)
session.commit()
print("Admin user created successfully")
print("Email: admin@example.com")
print("Password: password")
PYEOF

# Run the Python script
echo "Running admin user creation script..."
python create_admin.py

# Clean up
rm create_admin.py
EOF 