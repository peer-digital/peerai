#!/bin/bash
set -e

# Update package lists
sudo apt-get update

# Install essential packages
sudo apt-get install -y \
    git \
    curl \
    wget \
    gnupg \
    lsb-release \
    apt-transport-https \
    ca-certificates \
    software-properties-common \
    python3 \
    python3-pip \
    python3-venv \
    nginx \
    certbot \
    python3-certbot-nginx

# Install Node.js 18.x
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "Node.js installed: $(node --version)"
else
    echo "Node.js already installed: $(node --version)"
fi

# Install PostgreSQL
if ! command -v psql &> /dev/null; then
    sudo apt-get install -y postgresql postgresql-contrib
    echo "PostgreSQL installed: $(psql --version)"
    
    # Start PostgreSQL service
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Create database and user
    sudo -u postgres psql -c "CREATE USER peerai WITH PASSWORD 'peerai_password';"
    sudo -u postgres psql -c "CREATE DATABASE peerai_db OWNER peerai;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE peerai_db TO peerai;"
    
    echo "PostgreSQL database and user created"
else
    echo "PostgreSQL already installed: $(psql --version)"
fi

# Create application directory if it doesn't exist
if [ ! -d "/home/ubuntu/peer-ai" ]; then
    mkdir -p /home/ubuntu/peer-ai
    echo "Created application directory"
else
    echo "Application directory already exists"
fi

# Create nginx configuration directory if it doesn't exist
if [ ! -d "/etc/nginx/sites-available" ]; then
    sudo mkdir -p /etc/nginx/sites-available
    sudo mkdir -p /etc/nginx/sites-enabled
    echo "Created nginx configuration directories"
else
    echo "Nginx configuration directories already exist"
fi

echo "VM setup completed successfully" 