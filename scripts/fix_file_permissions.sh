#!/bin/bash

# fix_file_permissions.sh - Fix permission issues with frontend files
# @author: PeerAI Developer
# @description: Ensures proper permissions for nginx to access frontend files

# Configuration
VM_IP="158.174.210.91"  # @url: http://158.174.210.91
SSH_KEY="$(pwd)/PrivateKey.rsa"
DEPLOY_DIR="/home/ubuntu/peerai"
SSH_USER="ubuntu"

# Ensure SSH key has correct permissions
chmod 600 "$SSH_KEY"

echo "Fixing frontend file permissions..."

# Check directory paths and create if missing
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "
echo 'Checking directory paths...'
mkdir -p $DEPLOY_DIR/frontend/admin-dashboard/dist
cd $DEPLOY_DIR

# Show current permissions
echo 'Current permissions:'
ls -la
ls -la frontend/
ls -la frontend/admin-dashboard/
ls -la frontend/admin-dashboard/dist/

# Fix permissions from the top down
echo 'Fixing permissions...'
sudo chown -R $SSH_USER:$SSH_USER $DEPLOY_DIR
sudo chmod 755 $DEPLOY_DIR
sudo chmod 755 $DEPLOY_DIR/frontend
sudo chmod 755 $DEPLOY_DIR/frontend/admin-dashboard
sudo chmod 755 $DEPLOY_DIR/frontend/admin-dashboard/dist

# Make sure nginx can read all frontend files
sudo chown -R www-data:www-data $DEPLOY_DIR/frontend/admin-dashboard/dist
sudo find $DEPLOY_DIR/frontend/admin-dashboard/dist -type d -exec chmod 755 {} \;
sudo find $DEPLOY_DIR/frontend/admin-dashboard/dist -type f -exec chmod 644 {} \;

# Recreate test file
echo 'Creating test file...'
cat > $DEPLOY_DIR/frontend/admin-dashboard/dist/test.html << EOF
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
EOF

# Make sure test file has correct permissions
sudo chown www-data:www-data $DEPLOY_DIR/frontend/admin-dashboard/dist/test.html
sudo chmod 644 $DEPLOY_DIR/frontend/admin-dashboard/dist/test.html

# Restart nginx
echo 'Restarting nginx...'
sudo systemctl restart nginx

# Show updated permissions
echo 'Updated permissions:'
ls -la $DEPLOY_DIR/frontend/admin-dashboard/dist/
"

echo "Done. Try accessing the test page at http://$VM_IP/test.html"
echo "If the test page works but the app doesn't, there may be an issue with the frontend build." 