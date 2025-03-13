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

echo "Running database migrations on VM at $VM_IP..."

# SSH into the VM and run migrations
ssh -i "$SSH_KEY_FILE" $VM_USER@$VM_IP << 'EOF'
cd /home/ubuntu/peer-ai/backend
source venv/bin/activate

# Set the correct DATABASE_URL
export DATABASE_URL="postgresql://peerai:peerai_password@localhost:5432/peerai_db"

# Check current alembic version
echo "Current alembic version:"
python -c "from sqlalchemy import create_engine, text; engine = create_engine('$DATABASE_URL'); result = engine.connect().execute(text('SELECT version_num FROM alembic_version')).fetchone() if engine.dialect.has_table(engine.connect(), 'alembic_version') else None; print(result[0] if result else 'No version found')"

# Run migrations
echo "Running migrations..."
python -m alembic upgrade head

# Verify migrations were applied
echo "Verifying migrations..."
python -c "from sqlalchemy import create_engine, text; engine = create_engine('$DATABASE_URL'); result = engine.connect().execute(text('SELECT version_num FROM alembic_version')).fetchone(); print(f'New alembic version: {result[0] if result else \"No version found\"}')"

# List tables in the database
echo "Tables in the database:"
python -c "from sqlalchemy import create_engine, inspect; engine = create_engine('$DATABASE_URL'); print('\n'.join(inspect(engine).get_table_names()))"
EOF 