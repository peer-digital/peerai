#!/bin/bash
set -e

echo "Starting deployment process on VM..."

# Extract scripts
cd /home/ubuntu
mkdir -p scripts
tar -xzf deployment/scripts.tar.gz -C /home/ubuntu/
chmod +x /home/ubuntu/deployment_temp/*.sh
cp /home/ubuntu/deployment_temp/*.sh /home/ubuntu/scripts/
chmod +x /home/ubuntu/scripts/*.sh

# Run pre-deployment script
echo "Running pre-deployment preparation..."
/home/ubuntu/scripts/pre_deploy.sh

# Create application directory if it doesn't exist
mkdir -p /home/ubuntu/peer-ai/frontend/dist

# Extract frontend build
echo "Extracting frontend build..."
tar -xzf deployment/frontend-build.tar.gz -C /home/ubuntu/peer-ai/frontend/
# Ensure the frontend files are in the correct location
if [ -d "/home/ubuntu/peer-ai/frontend/dist" ]; then
    echo "Frontend build extracted to the correct location."
else
    echo "Frontend build not found in expected location. Checking for alternative paths..."
    if [ -d "/home/ubuntu/peer-ai/frontend/admin-dashboard/dist" ]; then
        echo "Found frontend build in admin-dashboard subdirectory. Moving to correct location..."
        cp -r /home/ubuntu/peer-ai/frontend/admin-dashboard/dist/* /home/ubuntu/peer-ai/frontend/dist/
    fi
fi

# Set proper permissions for frontend files
sudo chmod -R 755 /home/ubuntu/peer-ai/frontend/dist
sudo chown -R www-data:www-data /home/ubuntu/peer-ai/frontend/dist

# Run main deployment script
echo "Running main deployment..."
cd /home/ubuntu/peer-ai
/home/ubuntu/scripts/deploy.sh

# Run database initialization if needed
echo "Initializing database if needed..."
if [ -f "/home/ubuntu/scripts/init_db.sh" ]; then
    /home/ubuntu/scripts/init_db.sh
else
    echo "Database initialization script not found, skipping..."
fi

# Run cleanup
echo "Running post-deployment cleanup..."
if [ -f "/home/ubuntu/scripts/cleanup.sh" ]; then
    /home/ubuntu/scripts/cleanup.sh
else
    echo "Cleanup script not found, skipping..."
fi

# Check deployment status
echo "Checking deployment status..."
if [ -f "/home/ubuntu/scripts/check_deployment.sh" ]; then
    /home/ubuntu/scripts/check_deployment.sh
else
    echo "Deployment check script not found, skipping..."
    # Basic deployment check
    echo "Performing basic deployment check..."
    if curl -s http://localhost:8000/health | grep -q "healthy"; then
        echo "✅ Backend health check passed"
    else
        echo "❌ Backend health check failed"
    fi
    
    if [ -f "/home/ubuntu/peer-ai/frontend/dist/index.html" ]; then
        echo "✅ Frontend files found"
    else
        echo "❌ Frontend files not found"
    fi
fi

echo "Deployment process completed!" 