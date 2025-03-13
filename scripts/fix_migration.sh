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

echo "Fixing migration issue on VM at $VM_IP..."

# SSH into the VM and fix the migration issue
ssh -i "$SSH_KEY_FILE" $VM_USER@$VM_IP << 'EOF'
cd /home/ubuntu/peer-ai/backend
source venv/bin/activate

# Set the correct DATABASE_URL
export DATABASE_URL="postgresql://peerai:peerai_password@localhost:5432/peerai_db"

# Create a Python script to fix the migration
cat > fix_migration.py << 'PYEOF'
from sqlalchemy import create_engine, text
import os

# Get the database URL from environment variable
database_url = os.getenv('DATABASE_URL', 'postgresql://peerai:peerai_password@localhost:5432/peerai_db')

# Create engine
engine = create_engine(database_url)

# Connect to the database
with engine.connect() as connection:
    # Begin a transaction
    with connection.begin():
        # Update the alembic_version table to skip the problematic migration
        connection.execute(text("UPDATE alembic_version SET version_num = '16e5e60f9836'"))
        
        # Check if the referrals table exists
        result = connection.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'referrals')"
        )).fetchone()
        
        if result[0]:
            # Check if the constraint exists
            result = connection.execute(text(
                "SELECT COUNT(*) FROM pg_constraint WHERE conname = 'uq_referrals_referee_id'"
            )).fetchone()
            
            if result[0] > 0:
                # Drop the constraint if it exists
                connection.execute(text("ALTER TABLE referrals DROP CONSTRAINT uq_referrals_referee_id"))
                print("Dropped constraint 'uq_referrals_referee_id'")
            else:
                print("Constraint 'uq_referrals_referee_id' does not exist, skipping")
                
            # Add email verification fields to users table if they don't exist
            result = connection.execute(text(
                "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified')"
            )).fetchone()
            
            if not result[0]:
                connection.execute(text(
                    "ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE"
                ))
                print("Added 'email_verified' column to users table")
                
            result = connection.execute(text(
                "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'verification_token')"
            )).fetchone()
            
            if not result[0]:
                connection.execute(text(
                    "ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)"
                ))
                print("Added 'verification_token' column to users table")
                
            result = connection.execute(text(
                "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'verification_token_expires_at')"
            )).fetchone()
            
            if not result[0]:
                connection.execute(text(
                    "ALTER TABLE users ADD COLUMN verification_token_expires_at TIMESTAMP"
                ))
                print("Added 'verification_token_expires_at' column to users table")
        else:
            print("Table 'referrals' does not exist, skipping constraint drop")

print("Migration fix completed successfully")
PYEOF

# Run the Python script
echo "Running migration fix script..."
python fix_migration.py

# Run migrations again to continue from the fixed point
echo "Running remaining migrations..."
python -m alembic upgrade head

# Verify migrations were applied
echo "Verifying migrations..."
python -c "from sqlalchemy import create_engine, text; engine = create_engine('$DATABASE_URL'); result = engine.connect().execute(text('SELECT version_num FROM alembic_version')).fetchone(); print(f'New alembic version: {result[0] if result else \"No version found\"}')"

# List tables in the database
echo "Tables in the database:"
python -c "from sqlalchemy import create_engine, inspect; engine = create_engine('$DATABASE_URL'); print('\n'.join(inspect(engine).get_table_names()))"

# Clean up
rm fix_migration.py
EOF 