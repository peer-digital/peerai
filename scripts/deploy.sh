#!/bin/bash

# deploy.sh - Deployment script for PeerAI application
# @author: PeerAI Developer
# @description: Creates a tarball of the app and uploads to remote VM

# Stop script on errors
set -e

# Configuration
VM_IP="158.174.210.91"  # @url: http://158.174.210.91
SSH_KEY="$(pwd)/PrivateKey.rsa"
DEPLOY_DIR="/home/ubuntu/peer-ai"  # @note: Fixed hyphen in directory name
TARBALL_NAME="peerai-deploy.tar.gz"
SSH_USER="ubuntu"

# Debug: Print environment variable status (not values)
echo "Checking environment variables in deploy.sh:"
for var in DATABASE_URL EXTERNAL_LLM_API_KEY HOSTED_LLM_API_KEY JWT_SECRET_KEY GOOGLE_SERVICE_ACCOUNT_CREDS; do
  if [ ! -z "${!var}" ]; then 
    echo "$var is set"
  else 
    echo "Warning: Environment variable $var is not set"
  fi
done

# Check if the private key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "Error: SSH key not found at $SSH_KEY"
    exit 1
fi

# Ensure SSH key has correct permissions
chmod 600 "$SSH_KEY"

# Clean up any existing tarball
rm -f "$TARBALL_NAME"

# Clean up Apple metadata files from the dist directory
echo "Cleaning up Apple metadata files..."
find frontend/admin-dashboard/dist -name "._*" -delete
find frontend/admin-dashboard/dist -name ".DS_Store" -delete

# Create tarball of the frontend application
echo "Creating frontend deployment tarball..."
tar --exclude="node_modules" \
    --exclude=".git" \
    --exclude=".DS_Store" \
    --exclude="._*" \
    -czf "$TARBALL_NAME" \
    frontend/admin-dashboard/dist

# Check if we can connect to the VM
echo "Checking connection to VM..."
ssh -i "$SSH_KEY" -o "StrictHostKeyChecking=no" "$SSH_USER@$VM_IP" "echo 'SSH connection successful'"

# Clean up existing frontend directory and create new one with proper permissions
echo "Cleaning up and creating frontend directory on VM..."
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo rm -rf $DEPLOY_DIR/frontend && sudo mkdir -p $DEPLOY_DIR/frontend && sudo chown -R $SSH_USER:$SSH_USER $DEPLOY_DIR/frontend"

# Upload tarball to VM
echo "Uploading frontend tarball to VM..."
scp -i "$SSH_KEY" "$TARBALL_NAME" "$SSH_USER@$VM_IP:$DEPLOY_DIR/frontend/"

# Extract tarball on VM with proper permissions
echo "Extracting frontend tarball on VM..."
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "cd $DEPLOY_DIR/frontend && tar -xzf $TARBALL_NAME && chmod -R 755 ."

# Create systemd service files with environment variables
echo "Creating systemd service files..."
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo tee /etc/systemd/system/peerai-backend.service > /dev/null << EOF
[Unit]
Description=PeerAI Backend Service
After=network.target

[Service]
User=$SSH_USER
WorkingDirectory=$DEPLOY_DIR
Environment=\"PYTHONPATH=$DEPLOY_DIR\"
Environment=\"DATABASE_URL=$DATABASE_URL\"
Environment=\"EXTERNAL_LLM_API_KEY=$EXTERNAL_LLM_API_KEY\"
Environment=\"HOSTED_LLM_API_KEY=$HOSTED_LLM_API_KEY\"
Environment=\"JWT_SECRET_KEY=$JWT_SECRET_KEY\"
Environment=\"GOOGLE_SERVICE_ACCOUNT_CREDS=$GOOGLE_SERVICE_ACCOUNT_CREDS\"
Environment=\"ACCESS_TOKEN_EXPIRE_MINUTES=30\"
Environment=\"RATE_LIMIT_MINUTE=60\"
Environment=\"ENVIRONMENT=production\"
Environment=\"ALLOWED_ORIGIN=http://${VM_IP}\"
Environment=\"EXTERNAL_MODEL=mistral-tiny\"
Environment=\"EXTERNAL_LLM_URL=https://api.mistral.ai/v1/chat/completions\"
Environment=\"DEBUG=false\"
Environment=\"MOCK_MODE=false\"
Environment=\"LOG_LEVEL=INFO\"
Environment=\"GOOGLE_WORKSPACE_ADMIN_EMAIL=adam.falkenberg@peerdigital.se\"
Environment=\"NOTIFICATION_EMAIL_ALIAS=notifications@peerdigital.se\"
Environment=\"VITE_TEST_EMAIL=admin@peerai.se\"
Environment=\"VITE_TEST_PASSWORD=admin123\"
Environment=\"JWT_ALGORITHM=HS256\"
Environment=\"VITE_API_BASE_URL=http://${VM_IP}\"
Environment=\"VITE_APP_ENV=production\"
Environment=\"VITE_AUTH_ENABLED=true\"
ExecStart=$DEPLOY_DIR/.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
Restart=always
Environment=\"PATH=$DEPLOY_DIR/.venv/bin:/usr/bin\"

[Install]
WantedBy=multi-user.target
EOF"

# Start the services
echo "Starting services..."
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo systemctl daemon-reload && sudo systemctl enable peerai-backend && sudo systemctl restart peerai-backend"

echo "Deployment complete!"
echo "Frontend available at: http://${VM_IP}"
echo "Backend API available at: http://${VM_IP}/api/v1"
echo "Raw backend access at: http://${VM_IP}:8000" 