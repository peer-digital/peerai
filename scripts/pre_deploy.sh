#!/bin/bash
set -e

echo "Starting pre-deployment preparation..."

# Ensure required packages are installed
echo "Ensuring required packages are installed..."
sudo apt-get update
sudo apt-get install -y python3-venv python3-pip nginx postgresql postgresql-contrib git

# Check PostgreSQL status
echo "Checking PostgreSQL status..."
if ! systemctl is-active --quiet postgresql; then
    echo "PostgreSQL is not running. Starting PostgreSQL..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# Check Nginx status
echo "Checking Nginx status..."
if ! systemctl is-active --quiet nginx; then
    echo "Nginx is not running. Starting Nginx..."
    sudo systemctl start nginx
    sudo systemctl enable nginx
fi

# Create application directories if they don't exist
mkdir -p /home/ubuntu/peer-ai/frontend/dist
mkdir -p /home/ubuntu/peer-ai/backend
mkdir -p /home/ubuntu/peer-ai/logs
mkdir -p /home/ubuntu/peer-ai/backups

# Setting proper ownership
echo "Setting proper ownership..."
sudo chown -R ubuntu:ubuntu /home/ubuntu/peer-ai

# Stop services before deployment
echo "Stopping services before deployment..."
sudo systemctl stop peerai.service || echo "PeerAI service not running or not found"
sudo pkill -f uvicorn || echo "No uvicorn processes found"

# Backup current database
echo "Backing up current database..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw peerai_db; then
    sudo -u postgres pg_dump peerai_db | gzip > /home/ubuntu/peer-ai/backups/peerai_db_pre_deploy_${TIMESTAMP}.sql.gz
    echo "Database backup created: /home/ubuntu/peer-ai/backups/peerai_db_pre_deploy_${TIMESTAMP}.sql.gz"
else
    echo "Database peerai_db does not exist yet, skipping backup"
    
    # Create database and user if they don't exist
    echo "Creating database and user..."
    sudo -u postgres psql -c "CREATE USER peerai WITH PASSWORD 'peerai_password';" || echo "User already exists"
    sudo -u postgres psql -c "CREATE DATABASE peerai_db OWNER peerai;" || echo "Database already exists"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE peerai_db TO peerai;" || echo "Privileges already granted"
fi

# Create requirements.txt if it doesn't exist
if [ ! -f "/home/ubuntu/peer-ai/backend/requirements.txt" ]; then
    echo "Creating requirements.txt..."
    mkdir -p /home/ubuntu/peer-ai/backend
    cat > /home/ubuntu/peer-ai/backend/requirements.txt << EOL
fastapi==0.110.0
uvicorn==0.27.1
sqlalchemy==2.0.27
alembic==1.13.1
psycopg2-binary==2.9.9
python-dotenv==1.0.0
pydantic==2.6.1
pydantic-settings==2.1.0
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
python-multipart==0.0.9
EOL
fi

echo "Pre-deployment preparation completed successfully!"
exit 0 