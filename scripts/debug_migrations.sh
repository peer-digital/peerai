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

echo "Debugging migration issues on VM at $VM_IP..."

# SSH into the VM and debug migration issues
ssh -i "$SSH_KEY_FILE" $VM_USER@$VM_IP << 'EOF'
cd /home/ubuntu/peer-ai/backend
source venv/bin/activate

# Set the correct DATABASE_URL
export DATABASE_URL="postgresql://peerai:peerai_password@localhost:5432/peerai_db"

echo "=== Checking database connection ==="
python -c "
from sqlalchemy import create_engine, text
import os

database_url = os.getenv('DATABASE_URL', 'postgresql://peerai:peerai_password@localhost:5432/peerai_db')
print(f'Using database URL: {database_url}')

try:
    engine = create_engine(database_url)
    with engine.connect() as connection:
        result = connection.execute(text('SELECT 1')).fetchone()
        print(f'Connection successful: {result[0]}')
except Exception as e:
    print(f'Connection failed: {e}')
"

echo -e "\n=== Checking alembic version ==="
python -c "
from sqlalchemy import create_engine, text
import os

database_url = os.getenv('DATABASE_URL', 'postgresql://peerai:peerai_password@localhost:5432/peerai_db')
engine = create_engine(database_url)

try:
    with engine.connect() as connection:
        if engine.dialect.has_table(connection, 'alembic_version'):
            result = connection.execute(text('SELECT version_num FROM alembic_version')).fetchone()
            print(f'Current alembic version: {result[0] if result else \"No version found\"}')
        else:
            print('alembic_version table does not exist')
except Exception as e:
    print(f'Error checking alembic version: {e}')
"

echo -e "\n=== Checking alembic history ==="
python -m alembic history

echo -e "\n=== Checking alembic current ==="
python -m alembic current

echo -e "\n=== Checking database tables ==="
python -c "
from sqlalchemy import create_engine, inspect
import os

database_url = os.getenv('DATABASE_URL', 'postgresql://peerai:peerai_password@localhost:5432/peerai_db')
engine = create_engine(database_url)
inspector = inspect(engine)

try:
    tables = inspector.get_table_names()
    print(f'Tables in database: {tables}')
    
    for table in tables:
        print(f'\nColumns in {table}:')
        for column in inspector.get_columns(table):
            print(f'  {column[\"name\"]}: {column[\"type\"]}')
except Exception as e:
    print(f'Error checking database tables: {e}')
"

echo -e "\n=== Checking alembic migration files ==="
ls -la alembic/versions/

echo -e "\n=== Attempting to run migrations with verbose output ==="
python -m alembic upgrade head --verbose

echo -e "\n=== Checking for errors in alembic.ini ==="
cat alembic.ini | grep -v "^;" | grep -v "^$"

echo -e "\n=== Checking for errors in alembic/env.py ==="
cat alembic/env.py
EOF 