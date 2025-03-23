#!/bin/bash

# fix_nginx.sh - Script to diagnose and fix nginx configuration issues
# @author: PeerAI Developer
# @description: Fixes common nginx configuration issues that cause 500 errors

# Configuration
VM_IP="158.174.210.91"  # @url: http://158.174.210.91
SSH_KEY="$(pwd)/PrivateKey.rsa"
DEPLOY_DIR="/home/ubuntu/peerai"
SSH_USER="ubuntu"

# Ensure SSH key has correct permissions
chmod 600 "$SSH_KEY"

echo "Checking nginx configuration and logs..."

# Check nginx error logs
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo tail -n 20 /var/log/nginx/error.log"

# Check if frontend files exist
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "ls -la $DEPLOY_DIR/frontend/admin-dashboard/dist/"

# Fix nginx configuration with absolute paths and correct permissions
# Note: Using quotes carefully to ensure proper escaping of nginx variables
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo tee /etc/nginx/sites-available/peerai > /dev/null << 'EOT'
server {
    listen 80;
    server_name 158.174.210.91;

    root /home/ubuntu/peerai/frontend/admin-dashboard/dist;
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

    # Enable error logs
    error_log /var/log/nginx/peerai_error.log debug;
    access_log /var/log/nginx/peerai_access.log;
}
EOT"

# Fix permissions on frontend directory
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo chown -R www-data:www-data $DEPLOY_DIR/frontend/admin-dashboard/dist"
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo chmod -R 755 $DEPLOY_DIR/frontend/admin-dashboard/dist"

# Test and reload nginx
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo nginx -t && sudo systemctl restart nginx"

# Create a test HTML file as a backup
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo tee $DEPLOY_DIR/frontend/admin-dashboard/dist/test.html > /dev/null << EOF
<!DOCTYPE html>
<html>
<head>
    <title>PeerAI Test Page</title>
</head>
<body>
    <h1>PeerAI Test Page</h1>
    <p>If you can see this page, the web server is working correctly.</p>
</body>
</html>
EOF"

echo "Done. Try accessing the application again at http://$VM_IP"
echo "You can also try the test page at http://$VM_IP/test.html"
echo "To check detailed nginx errors, run: ssh -i $SSH_KEY $SSH_USER@$VM_IP 'sudo tail -f /var/log/nginx/peerai_error.log'" 