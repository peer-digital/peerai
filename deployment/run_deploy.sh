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
    
    # Check if dist is inside another directory
    DIST_DIR=$(find /home/ubuntu/peer-ai/frontend -type d -name "dist" | head -n 1)
    
    if [ -n "$DIST_DIR" ]; then
        echo "Found dist directory at $DIST_DIR. Moving to correct location..."
        mkdir -p /home/ubuntu/peer-ai/frontend/dist
        cp -r $DIST_DIR/* /home/ubuntu/peer-ai/frontend/dist/
    elif [ -d "/home/ubuntu/peer-ai/frontend/admin-dashboard/dist" ]; then
        echo "Found frontend build in admin-dashboard subdirectory. Moving to correct location..."
        mkdir -p /home/ubuntu/peer-ai/frontend/dist
        cp -r /home/ubuntu/peer-ai/frontend/admin-dashboard/dist/* /home/ubuntu/peer-ai/frontend/dist/
    else
        echo "No frontend build found. Creating a placeholder index.html..."
        mkdir -p /home/ubuntu/peer-ai/frontend/dist
        cat > /home/ubuntu/peer-ai/frontend/dist/index.html << EOL
<!DOCTYPE html>
<html>
<head>
    <title>PeerAI</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f5f5f5;
        }
        .container {
            text-align: center;
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 600px;
        }
        h1 {
            color: #333;
        }
        p {
            color: #666;
            line-height: 1.6;
        }
        .api-status {
            margin-top: 20px;
            padding: 10px;
            background-color: #f0f0f0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>PeerAI Platform</h1>
        <p>The frontend is currently being deployed. Please check back later.</p>
        <div class="api-status">
            <p>API Status: <span id="api-status">Checking...</span></p>
        </div>
    </div>
    <script>
        // Check API status
        fetch('/health')
            .then(response => {
                if (response.ok) {
                    document.getElementById('api-status').textContent = 'Online';
                    document.getElementById('api-status').style.color = 'green';
                } else {
                    document.getElementById('api-status').textContent = 'Offline';
                    document.getElementById('api-status').style.color = 'red';
                }
            })
            .catch(error => {
                document.getElementById('api-status').textContent = 'Offline';
                document.getElementById('api-status').style.color = 'red';
            });
    </script>
</body>
</html>
EOL
    fi
fi

# Set proper permissions for frontend files
echo "Setting proper permissions for frontend files..."
sudo chmod -R 755 /home/ubuntu/peer-ai/frontend
sudo chmod -R 755 /home/ubuntu/peer-ai/frontend/dist
sudo chown -R www-data:www-data /home/ubuntu/peer-ai/frontend/dist

# Ensure parent directories have correct permissions
sudo chmod 755 /home
sudo chmod 755 /home/ubuntu
sudo chmod 755 /home/ubuntu/peer-ai

# Verify permissions
echo "Verifying frontend permissions..."
ls -la /home/ubuntu/peer-ai/frontend/dist
sudo -u www-data test -r /home/ubuntu/peer-ai/frontend/dist/index.html && echo "✅ www-data can read index.html" || echo "❌ www-data CANNOT read index.html"

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
        ls -la /home/ubuntu/peer-ai/frontend/dist
    else
        echo "❌ Frontend files not found"
    fi
    
    # Check Nginx configuration
    echo "Checking Nginx configuration..."
    sudo nginx -t
    
    # Check if frontend is accessible
    echo "Checking if frontend is accessible..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost)
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Frontend is accessible"
    else
        echo "❌ Frontend is not accessible (HTTP code: $HTTP_CODE)"
    fi
    
    # Check if API is accessible
    echo "Checking if API is accessible..."
    if curl -s http://localhost/api/ | grep -q "Welcome"; then
        echo "✅ API is accessible"
    else
        echo "❌ API is not accessible"
    fi
fi

echo "Deployment process completed!" 