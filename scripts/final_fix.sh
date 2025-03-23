#!/bin/bash

# final_fix.sh - Final fix for nginx configuration
# @author: PeerAI Developer
# @description: Creates a correct nginx config with proper escaping

# Configuration
VM_IP="158.174.210.91"  # @url: http://158.174.210.91
SSH_KEY="$(pwd)/PrivateKey.rsa"
SSH_USER="ubuntu"
NEW_DEPLOY_DIR="/home/ubuntu/peerai-frontend"

# Ensure SSH key has correct permissions
chmod 600 "$SSH_KEY"

echo "Creating final nginx configuration fix..."

# Create the nginx configuration locally first with proper escaping
cat > /tmp/peerai.conf << EOF
server {
    listen 80;
    server_name ${VM_IP};

    root ${NEW_DEPLOY_DIR};
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

# Upload the config to the VM
scp -i "$SSH_KEY" /tmp/peerai.conf "$SSH_USER@$VM_IP:/tmp/peerai.conf"

# Apply the config and restart nginx
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "
# Create the frontend directory if it doesn't exist
mkdir -p $NEW_DEPLOY_DIR

# Create a test page
cat > $NEW_DEPLOY_DIR/index.html << 'EOT'
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
    <p class='success'>Frontend server is working properly!</p>
    <p>The application is deployed and ready for use.</p>
    <p>This is a temporary placeholder.</p>
</body>
</html>
EOT

# Set proper permissions
chmod -R 755 $NEW_DEPLOY_DIR

# Apply the nginx config
sudo cp /tmp/peerai.conf /etc/nginx/sites-available/peerai
sudo nginx -t && sudo systemctl restart nginx
"

echo "Done. Try accessing the following pages:"
echo "- Frontend: http://$VM_IP/"
echo "- Backend API: http://$VM_IP/api/v1/" 