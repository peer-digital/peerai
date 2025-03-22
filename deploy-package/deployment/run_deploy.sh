#!/bin/bash
set -e

echo "Starting deployment process on VM..."

# Install prerequisites if needed
echo "Checking and installing prerequisites..."
if ! command -v nginx &> /dev/null; then
  echo "Installing Nginx..."
  sudo apt-get update
  sudo apt-get install -y nginx
fi

if ! command -v postgresql &> /dev/null; then
  echo "Installing PostgreSQL..."
  sudo apt-get update
  sudo apt-get install -y postgresql postgresql-contrib
fi

if ! command -v python3 &> /dev/null; then
  echo "Installing Python..."
  sudo apt-get update
  sudo apt-get install -y python3 python3-pip python3-venv
fi

# Always ensure python3-venv is installed (even if Python is already installed)
echo "Ensuring python3-venv is installed..."
sudo apt-get install -y python3-venv python3.12-venv

# Create application directory if it doesn't exist
mkdir -p /home/ubuntu/peer-ai/frontend
mkdir -p /home/ubuntu/peer-ai/backend

# Extract frontend build directly to the dist directory
# The frontend build should create a 'dist' folder inside.
echo "Extracting frontend build..."
# Update the path to look in the deployment directory instead
tar -xzf /home/ubuntu/deployment/frontend-build.tar.gz -C /home/ubuntu/peer-ai/frontend/ || echo "Warning: Failed to extract frontend build, file may be missing"

# Extract scripts
echo "Extracting scripts..."
mkdir -p /home/ubuntu/scripts
tar -xzf /home/ubuntu/deployment/scripts.tar.gz -C /home/ubuntu/scripts/ || echo "Warning: Failed to extract scripts, file may be missing"
chmod +x /home/ubuntu/scripts/*.sh 2>/dev/null || echo "Warning: No executable scripts found"

# Run database initialization if needed
echo "Initializing database if needed..."
if [ -f "/home/ubuntu/scripts/init_db.sh" ]; then
  /home/ubuntu/scripts/init_db.sh
else
  echo "Warning: init_db.sh script not found. Skipping database initialization."
fi

# Apply Nginx configuration 
echo "Setting up Nginx configuration..."
# First check for nginx.conf.latest, then fall back to nginx.conf
if [ -f "/home/ubuntu/deployment/nginx.conf.latest" ]; then
  echo "Using the latest NGINX configuration (nginx.conf.latest)..."
  sudo cp /home/ubuntu/deployment/nginx.conf.latest /etc/nginx/sites-available/peerai
elif [ -f "/home/ubuntu/peer-ai/deployment/nginx.conf" ]; then
  echo "Using existing NGINX configuration (nginx.conf)..."
  sudo cp /home/ubuntu/peer-ai/deployment/nginx.conf /etc/nginx/sites-available/peerai
else
  echo "Warning: No NGINX configuration file found. Nginx configuration not updated."
fi

# Create symbolic link if it doesn't exist
if [ -f "/etc/nginx/sites-available/peerai" ] && [ ! -f "/etc/nginx/sites-enabled/peerai" ]; then
  echo "Creating symbolic link for NGINX configuration..."
  sudo ln -s /etc/nginx/sites-available/peerai /etc/nginx/sites-enabled/peerai
fi

# Disable default site if enabled
if [ -f "/etc/nginx/sites-enabled/default" ]; then
  echo "Disabling default Nginx site..."
  sudo rm -f /etc/nginx/sites-enabled/default
fi

# Test and reload Nginx
if [ -f "/etc/nginx/sites-available/peerai" ]; then
  echo "Testing NGINX configuration..."
  if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "Nginx configuration updated successfully."
  else
    echo "Warning: Nginx configuration test failed. Configuration not applied."
  fi
fi

# Restart the backend service - only if it exists
echo "Checking backend service..."
if systemctl list-unit-files | grep -q peerai.service; then
  echo "Restarting backend service..."
  sudo systemctl restart peerai || echo "Warning: Failed to restart backend service, but continuing."
else
  echo "Backend service not installed yet - will be created by the main deployment script."
fi

# Basic check
echo "Running basic service checks..."
systemctl is-active --quiet nginx && echo "Nginx is running." || echo "Warning: Nginx is not running."
systemctl is-active --quiet postgresql && echo "PostgreSQL is running." || echo "Warning: PostgreSQL is not running."
# Don't check for the backend service yet, as it will be set up by deploy.sh

echo "Frontend deployment process completed!" 