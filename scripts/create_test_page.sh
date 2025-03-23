#!/bin/bash

# create_test_page.sh - Create a test page to verify nginx configuration
# @author: PeerAI Developer
# @description: Creates a test HTML page with proper permissions using sudo

# Configuration
VM_IP="158.174.210.91"  # @url: http://158.174.210.91
SSH_KEY="$(pwd)/PrivateKey.rsa"
DEPLOY_DIR="/home/ubuntu/peerai"
SSH_USER="ubuntu"

# Ensure SSH key has correct permissions
chmod 600 "$SSH_KEY"

echo "Creating test page to verify nginx configuration..."

# Create test page with sudo access
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo bash -c '
# Create directory if it doesn't exist
mkdir -p $DEPLOY_DIR/frontend/admin-dashboard/dist

# Create test HTML file
cat > $DEPLOY_DIR/frontend/admin-dashboard/dist/test.html << EOT
<!DOCTYPE html>
<html>
<head>
    <title>PeerAI Test Page</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        .success { color: green; }
    </style>
</head>
<body>
    <h1>PeerAI Test Page</h1>
    <p class=\"success\">If you can see this page, the web server is working correctly.</p>
    <p>Time created: $(date)</p>
</body>
</html>
EOT

# Create another test file in root directory
cat > $DEPLOY_DIR/frontend/admin-dashboard/dist/index.html << EOT
<!DOCTYPE html>
<html>
<head>
    <title>PeerAI Test Root</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        .success { color: blue; }
    </style>
</head>
<body>
    <h1>PeerAI Root Test Page</h1>
    <p class=\"success\">This is a test root page to verify nginx configuration.</p>
    <p>Time created: $(date)</p>
</body>
</html>
EOT

# Set proper permissions
chown -R www-data:www-data $DEPLOY_DIR/frontend/admin-dashboard/dist
chmod -R 755 $DEPLOY_DIR/frontend/admin-dashboard/dist

# Restart nginx
systemctl restart nginx

echo \"Test pages created successfully.\"
'"

echo "Done. Try accessing the following pages:"
echo "- Test page: http://$VM_IP/test.html"
echo "- Root page: http://$VM_IP/" 