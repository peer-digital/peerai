#!/bin/bash
set -e

echo "Starting deployment process on VM..."

# Create application directory if it doesn't exist
mkdir -p /home/ubuntu/peer-ai/frontend

# Extract frontend build directly to the dist directory
# The frontend build should create a 'dist' folder inside.
echo "Extracting frontend build..."
# Update the path to look in the deployment directory instead
tar -xzf /home/ubuntu/deployment/frontend-build.tar.gz -C /home/ubuntu/peer-ai/frontend/ || echo "Warning: Failed to extract frontend build, file may be missing"

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

# Restart the backend service
echo "Restarting backend service..."
sudo systemctl restart peerai

# Basic check
echo "Running basic service checks..."
systemctl is-active --quiet nginx && echo "Nginx is running." || echo "Warning: Nginx is not running."
systemctl is-active --quiet postgresql && echo "PostgreSQL is running." || echo "Warning: PostgreSQL is not running."
systemctl is-active --quiet peerai && echo "Backend service is running." || echo "Warning: Backend service is not running."

echo "Deployment process completed!" 