#!/bin/bash

# fix_nginx_root.sh - Fix nginx root directory issues
# @author: PeerAI Developer
# @description: Creates a new directory for nginx to serve from where we have write permissions

# Configuration
VM_IP="158.174.210.91"  # @url: http://158.174.210.91
SSH_KEY="$(pwd)/PrivateKey.rsa"
SSH_USER="ubuntu"
NEW_DEPLOY_DIR="/home/ubuntu/peerai-frontend"

# Ensure SSH key has correct permissions
chmod 600 "$SSH_KEY"

echo "Creating new frontend directory with proper permissions..."

# Create new directory and test page structure
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "
# Create new directory 
mkdir -p $NEW_DEPLOY_DIR

# Create a simple test index.html
cat > $NEW_DEPLOY_DIR/index.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>PeerAI Frontend</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
        h1 { color: #333; }
        p { margin: 20px 0; }
        .success { color: green; font-weight: bold; }
    </style>
</head>
<body>
    <h1>PeerAI Frontend</h1>
    <p class=\"success\">Frontend server is working properly!</p>
    <p>The application is deployed and ready for use.</p>
    <p>Time: $(date)</p>
    <p>Server: $VM_IP</p>
</body>
</html>
EOF

# Create a simple api test page
mkdir -p $NEW_DEPLOY_DIR/api
cat > $NEW_DEPLOY_DIR/api/index.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>PeerAI API Proxy Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
        h1 { color: #333; }
        p { margin: 20px 0; }
        .warning { color: orange; font-weight: bold; }
    </style>
</head>
<body>
    <h1>PeerAI API Proxy Test</h1>
    <p class=\"warning\">This is the static HTML version of the API path.</p>
    <p>If you're seeing this page instead of getting proper API responses, 
    the proxy to the backend server is not configured correctly.</p>
    <p>Time: $(date)</p>
</body>
</html>
EOF

# Ensure proper ownership
chmod -R 755 $NEW_DEPLOY_DIR
"

# Update nginx configuration to use the new directory
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo bash -c '
cat > /etc/nginx/sites-available/peerai << EOF
server {
    listen 80;
    server_name $VM_IP;

    root $NEW_DEPLOY_DIR;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Detailed error logs
    error_log /var/log/nginx/peerai_error.log debug;
    access_log /var/log/nginx/peerai_access.log;
}
EOF

# Test nginx config and restart
nginx -t && systemctl restart nginx
'"

echo "Done. Try accessing the following pages:"
echo "- Frontend: http://$VM_IP/"
echo "- API test: http://$VM_IP/api/"  
echo "- Backend API: http://$VM_IP/api/v1/" 