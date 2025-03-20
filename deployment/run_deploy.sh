#!/bin/bash
set -e

echo "Starting deployment process on VM..."

# Extract scripts
cd /home/ubuntu
mkdir -p scripts
tar -xzf deployment/scripts.tar.gz -C /home/ubuntu/
chmod +x /home/ubuntu/scripts/*.sh

# Run pre-deployment script (ensure it exists and is executable)
echo "Running pre-deployment preparation..."
/home/ubuntu/scripts/pre_deploy.sh

# Create application directory if it doesn't exist
mkdir -p /home/ubuntu/peer-ai/frontend

# Extract frontend build
# Note: The frontend build artifact is now named `frontend-build.tar.gz` and contains the `dist/` directory
echo "Extracting frontend build..."
tar -xzf deployment/frontend-build.tar.gz -C /home/ubuntu/peer-ai/frontend/

# Fix permissions
echo "Fixing file permissions..."
/home/ubuntu/scripts/fix_permissions.sh

# Copy the .env.example to .env (only if .env doesn't already exist)
if [ ! -f "/home/ubuntu/peer-ai/backend/.env" ]; then
  echo "Creating .env file from .env.example"
  cp /home/ubuntu/peer-ai/backend/.env.example /home/ubuntu/peer-ai/backend/.env
fi

# Run main deployment script
# This will handle backend setup (installing dependencies, running migrations)
echo "Running main deployment..."
cd /home/ubuntu/peer-ai
/home/ubuntu/scripts/deploy.sh


# Run database initialization if needed
# The init_db.sh script should check if initialization is needed before running.
echo "Initializing database if needed..."
/home/ubuntu/scripts/init_db.sh

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
  echo "Warning: Nginx configuration file not found."
fi

# Run cleanup
echo "Running post-deployment cleanup..."
/home/ubuntu/scripts/cleanup.sh

# Check deployment status
echo "Checking deployment status..."
/home/ubuntu/scripts/check_deployment.sh

echo "Deployment process completed!" 