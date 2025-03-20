#!/bin/bash
set -e

echo "Starting deployment process on VM..."

# Extract scripts
cd /home/ubuntu
mkdir -p scripts
tar -xzf deployment/scripts.tar.gz -C /home/ubuntu/scripts/
chmod +x /home/ubuntu/scripts/*.sh

# Run pre-deployment script (ensure it exists and is executable)
echo "Running pre-deployment preparation..."
if [ -f "/home/ubuntu/scripts/pre_deploy.sh" ]; then
  /home/ubuntu/scripts/pre_deploy.sh
else
  echo "Warning: pre_deploy.sh script not found. Skipping pre-deployment."
fi

# Create application directory if it doesn't exist
mkdir -p /home/ubuntu/peer-ai/frontend

# Extract frontend build
# Note: The frontend build artifact is now named `frontend-build.tar.gz` and contains the `dist/` directory
echo "Extracting frontend build..."
tar -xzf deployment/frontend-build.tar.gz -C /home/ubuntu/peer-ai/frontend/

# Fix permissions
echo "Fixing file permissions..."
if [ -f "/home/ubuntu/scripts/fix_permissions.sh" ]; then
  /home/ubuntu/scripts/fix_permissions.sh
else
  echo "Warning: fix_permissions.sh script not found. Setting basic permissions..."
  # Basic permission fixes
  chmod -R 755 /home/ubuntu/peer-ai/frontend/dist
  chmod -R +rx /home/ubuntu/scripts/*.sh
fi

# Copy the .env.example to .env (only if .env doesn't already exist)
if [ ! -f "/home/ubuntu/peer-ai/backend/.env" ]; then
  echo "Creating .env file from .env.example"
  if [ -f "/home/ubuntu/peer-ai/backend/.env.example" ]; then
    cp /home/ubuntu/peer-ai/backend/.env.example /home/ubuntu/peer-ai/backend/.env
  else
    echo "Warning: .env.example file not found. Environment configuration may be incomplete."
  fi
fi

# Run main deployment script
# This will handle backend setup (installing dependencies, running migrations)
echo "Running main deployment..."
cd /home/ubuntu/peer-ai
if [ -f "/home/ubuntu/scripts/deploy.sh" ]; then
  /home/ubuntu/scripts/deploy.sh
else
  echo "Error: deploy.sh script not found. Deployment cannot proceed."
  exit 1
fi

# Run database initialization if needed
# The init_db.sh script should check if initialization is needed before running.
echo "Initializing database if needed..."
if [ -f "/home/ubuntu/scripts/init_db.sh" ]; then
  /home/ubuntu/scripts/init_db.sh
else
  echo "Warning: init_db.sh script not found. Skipping database initialization."
fi

# Apply Nginx configuration
echo "Setting up Nginx configuration..."
if [ -f "/home/ubuntu/peer-ai/deployment/nginx.conf" ]; then
  sudo cp /home/ubuntu/peer-ai/deployment/nginx.conf /etc/nginx/sites-available/peerai
  
  # Create symbolic link if it doesn't exist
  if [ ! -f "/etc/nginx/sites-enabled/peerai" ]; then
    sudo ln -s /etc/nginx/sites-available/peerai /etc/nginx/sites-enabled/peerai
  fi
  
  # Test and reload Nginx
  if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "Nginx configuration updated successfully."
  else
    echo "Warning: Nginx configuration test failed. Configuration not applied."
  fi
else
  echo "Warning: Nginx configuration file not found. Nginx configuration not updated."
fi

# Run cleanup
echo "Running post-deployment cleanup..."
if [ -f "/home/ubuntu/scripts/cleanup.sh" ]; then
  /home/ubuntu/scripts/cleanup.sh
else
  echo "Warning: cleanup.sh script not found. Skipping cleanup."
fi

# Check deployment status
echo "Checking deployment status..."
if [ -f "/home/ubuntu/scripts/check_deployment.sh" ]; then
  /home/ubuntu/scripts/check_deployment.sh
else
  echo "Warning: check_deployment.sh script not found. Skipping deployment check."
  # Basic check
  echo "Running basic service checks..."
  systemctl is-active --quiet nginx && echo "Nginx is running." || echo "Warning: Nginx is not running."
  systemctl is-active --quiet postgresql && echo "PostgreSQL is running." || echo "Warning: PostgreSQL is not running."
fi

echo "Deployment process completed!" 