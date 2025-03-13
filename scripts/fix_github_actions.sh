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

echo "Fixing GitHub Actions deployment issues on VM at $VM_IP..."

# SSH into the VM and fix GitHub Actions deployment issues
ssh -i "$SSH_KEY_FILE" $VM_USER@$VM_IP << 'EOF'
cd /home/ubuntu/peer-ai

# Check if the peer-ai directory exists
if [ ! -d "/home/ubuntu/peer-ai" ]; then
    echo "Error: peer-ai directory does not exist"
    exit 1
fi

# Check if the backend directory exists
if [ ! -d "/home/ubuntu/peer-ai/backend" ]; then
    echo "Error: backend directory does not exist"
    exit 1
fi

# Check if the venv directory exists in the backend directory
if [ ! -d "/home/ubuntu/peer-ai/backend/venv" ]; then
    echo "Creating Python virtual environment..."
    cd /home/ubuntu/peer-ai/backend
    python3 -m venv venv
fi

# Activate the virtual environment and install dependencies
cd /home/ubuntu/peer-ai/backend
source venv/bin/activate

# Check if requirements.txt exists
if [ ! -f "/home/ubuntu/peer-ai/backend/requirements.txt" ]; then
    echo "Error: requirements.txt does not exist"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Set the correct DATABASE_URL
export DATABASE_URL="postgresql://peerai:peerai_password@localhost:5432/peerai_db"

# Check if the database exists
echo "Checking if database exists..."
if ! PGPASSWORD='peerai_password' psql -U peerai -h localhost -lqt | cut -d \| -f 1 | grep -qw peerai_db; then
    echo "Database does not exist, creating it..."
    sudo -u postgres psql -c "CREATE DATABASE peerai_db OWNER peerai;"
fi

# Check if the alembic directory exists
if [ ! -d "/home/ubuntu/peer-ai/backend/alembic" ]; then
    echo "Error: alembic directory does not exist"
    exit 1
fi

# Check if the alembic.ini file exists
if [ ! -f "/home/ubuntu/peer-ai/backend/alembic.ini" ]; then
    echo "Error: alembic.ini does not exist"
    exit 1
fi

# Try to run migrations with error handling
echo "Running migrations..."
if ! python -m alembic upgrade head; then
    echo "Migration failed, trying to fix..."
    
    # Check if alembic_version table exists
    if PGPASSWORD='peerai_password' psql -U peerai -h localhost -d peerai_db -c "SELECT 1 FROM information_schema.tables WHERE table_name = 'alembic_version'" | grep -q 1; then
        echo "alembic_version table exists, checking current version..."
        current_version=$(PGPASSWORD='peerai_password' psql -U peerai -h localhost -d peerai_db -c "SELECT version_num FROM alembic_version" -t | tr -d '[:space:]')
        echo "Current version: $current_version"
        
        # If the version is empty or null, set it to the first migration
        if [ -z "$current_version" ] || [ "$current_version" = "NULL" ]; then
            echo "Setting version to the first migration..."
            first_migration=$(ls -1 alembic/versions/*.py | head -1 | xargs basename | cut -d_ -f1)
            PGPASSWORD='peerai_password' psql -U peerai -h localhost -d peerai_db -c "UPDATE alembic_version SET version_num = '$first_migration'"
        fi
    else
        echo "alembic_version table does not exist, creating it..."
        PGPASSWORD='peerai_password' psql -U peerai -h localhost -d peerai_db -c "CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL, PRIMARY KEY (version_num))"
        
        # Get the first migration
        first_migration=$(ls -1 alembic/versions/*.py | head -1 | xargs basename | cut -d_ -f1)
        echo "Setting version to the first migration: $first_migration"
        PGPASSWORD='peerai_password' psql -U peerai -h localhost -d peerai_db -c "INSERT INTO alembic_version (version_num) VALUES ('$first_migration')"
    fi
    
    # Try to run migrations again
    echo "Trying to run migrations again..."
    python -m alembic upgrade head || echo "Migration failed again, manual intervention required"
fi

# Check if the frontend directory exists
if [ ! -d "/home/ubuntu/peer-ai/frontend" ]; then
    echo "Error: frontend directory does not exist"
    exit 1
fi

# Check if the admin-dashboard directory exists in the frontend directory
if [ ! -d "/home/ubuntu/peer-ai/frontend/admin-dashboard" ]; then
    echo "Error: admin-dashboard directory does not exist"
    exit 1
fi

# Check if the package.json file exists in the admin-dashboard directory
if [ ! -f "/home/ubuntu/peer-ai/frontend/admin-dashboard/package.json" ]; then
    echo "Error: package.json does not exist"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed, installing it..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install frontend dependencies and build
cd /home/ubuntu/peer-ai/frontend/admin-dashboard
echo "Installing frontend dependencies..."
npm ci || npm install

# Build the frontend
echo "Building frontend..."
npm run build

# Check if the nginx configuration exists
if [ ! -f "/etc/nginx/sites-available/peerai" ]; then
    echo "Error: nginx configuration does not exist"
    exit 1
fi

# Check if the nginx configuration is enabled
if [ ! -f "/etc/nginx/sites-enabled/peerai" ]; then
    echo "Enabling nginx configuration..."
    sudo ln -s /etc/nginx/sites-available/peerai /etc/nginx/sites-enabled/peerai
fi

# Test nginx configuration
echo "Testing nginx configuration..."
sudo nginx -t

# Reload nginx
echo "Reloading nginx..."
sudo systemctl reload nginx

# Check if the systemd service file exists
if [ ! -f "/etc/systemd/system/peerai.service" ]; then
    echo "Error: systemd service file does not exist"
    exit 1
fi

# Reload systemd
echo "Reloading systemd..."
sudo systemctl daemon-reload

# Enable and restart the service
echo "Enabling and restarting the service..."
sudo systemctl enable peerai.service
sudo systemctl restart peerai.service

# Check the service status
echo "Checking service status..."
sudo systemctl status peerai.service

echo "GitHub Actions deployment fix completed!"
EOF 