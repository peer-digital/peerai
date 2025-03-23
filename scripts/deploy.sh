#!/bin/bash

# deploy.sh - Deployment script for PeerAI application
# @author: PeerAI Developer
# @description: Creates a tarball of the app and uploads to remote VM

# Stop script on errors
set -e

# Configuration
VM_IP="158.174.210.91"  # @url: http://158.174.210.91
SSH_KEY="$(pwd)/PrivateKey.rsa"
DEPLOY_DIR="/home/ubuntu/peerai"
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

# Create production environment file from environment variables immediately
echo "Creating production environment files..."
# Use absolute path for .env.production
ENV_FILE="/home/ubuntu/peer-ai/.env.production"
mkdir -p "$(dirname "$ENV_FILE")"
cat > "$ENV_FILE" << EOL
# @important: Render hosted PostgreSQL database - do not modify without approval
DATABASE_URL=${DATABASE_URL}
ENVIRONMENT=production
DEBUG=false
MOCK_MODE=false
LOG_LEVEL=INFO
HOSTED_LLM_API_KEY=${HOSTED_LLM_API_KEY}
EXTERNAL_LLM_API_KEY=${EXTERNAL_LLM_API_KEY}
EXTERNAL_MODEL=mistral-tiny
EXTERNAL_LLM_URL=https://api.mistral.ai/v1/chat/completions
# @important: Production uses the VM IP
ALLOWED_ORIGIN="http://${VM_IP}"
# Google service account credentials - Base64 encoded JSON
GOOGLE_SERVICE_ACCOUNT_CREDS=${GOOGLE_SERVICE_ACCOUNT_CREDS}

# Email configurations
GOOGLE_WORKSPACE_ADMIN_EMAIL=adam.falkenberg@peerdigital.se
NOTIFICATION_EMAIL_ALIAS=notifications@peerdigital.se
VITE_TEST_EMAIL=admin@peerai.se
VITE_TEST_PASSWORD=admin123

# JWT and authentication settings
ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_ALGORITHM=HS256
JWT_SECRET_KEY=${JWT_SECRET_KEY}

# Application settings
MOCK_MODE=false

# @important: API base URL - do not change without updating nginx config
VITE_API_BASE_URL=http://${VM_IP}
MOCK_MODE=false
VITE_APP_ENV=production
EOL

# Ensure frontend .env file is set correctly
FRONTEND_ENV_FILE="/home/ubuntu/peer-ai/frontend/admin-dashboard/.env.production"
mkdir -p "$(dirname "$FRONTEND_ENV_FILE")"
cat > "$FRONTEND_ENV_FILE" << EOL
VITE_API_BASE_URL=http://${VM_IP}
VITE_AUTH_ENABLED=true
EOL

# Debug: Check if environment files were created
if [ -f "$ENV_FILE" ]; then
    echo ".env.production file created successfully"
    ls -l "$ENV_FILE"
else
    echo "Error: Failed to create .env.production"
    exit 1
fi

if [ -f "$FRONTEND_ENV_FILE" ]; then
    echo "Frontend .env.production file created successfully"
    ls -l "$FRONTEND_ENV_FILE"
else
    echo "Error: Failed to create frontend .env.production"
    exit 1
fi

# Check if the private key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "Error: SSH key not found at $SSH_KEY"
    exit 1
fi

# Ensure SSH key has correct permissions
chmod 600 "$SSH_KEY"

# Build the frontend
echo "Building frontend..."
cd frontend/admin-dashboard
# Only install dependencies if package.json has changed
if [ ! -f "node_modules/.package.json.hash" ] || [ "$(md5sum package.json | cut -d' ' -f1)" != "$(cat node_modules/.package.json.hash)" ]; then
    echo "Installing frontend dependencies..."
    rm -rf node_modules package-lock.json
    npm install
    md5sum package.json > node_modules/.package.json.hash
fi
# Create a clean build
rm -rf dist
npm run build
cd ../..

# Clean up any existing tarball
rm -f "$TARBALL_NAME"

# Clean up Apple metadata files from the dist directory
echo "Cleaning up Apple metadata files..."
find frontend/admin-dashboard/dist -name "._*" -delete
find frontend/admin-dashboard/dist -name ".DS_Store" -delete

# Create tarball of the application, excluding unnecessary files
echo "Creating deployment tarball..."
tar --exclude="node_modules" \
    --exclude=".git" \
    --exclude=".venv" \
    --exclude="venv" \
    --exclude="__pycache__" \
    --exclude="*.pyc" \
    --exclude=".pytest_cache" \
    --exclude="frontend/admin-dashboard/node_modules" \
    --exclude=".DS_Store" \
    --exclude="._*" \
    -czf "$TARBALL_NAME" \
    backend \
    frontend/admin-dashboard/dist \
    .env.production \
    frontend/admin-dashboard/.env.production \
    scripts \
    requirements.txt \
    package.json \
    package-lock.json

# Check if we can connect to the VM
echo "Checking connection to VM..."
ssh -i "$SSH_KEY" -o "StrictHostKeyChecking=no" "$SSH_USER@$VM_IP" "echo 'SSH connection successful'"

# Clean up existing deployment directory and create new one with proper permissions
echo "Cleaning up and creating deployment directory on VM..."
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo rm -rf $DEPLOY_DIR && sudo mkdir -p $DEPLOY_DIR && sudo chown -R $SSH_USER:$SSH_USER $DEPLOY_DIR"

# Upload tarball to VM
echo "Uploading tarball to VM..."
scp -i "$SSH_KEY" "$TARBALL_NAME" "$SSH_USER@$VM_IP:$DEPLOY_DIR/"

# Extract tarball on VM with proper permissions
echo "Extracting tarball on VM..."
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "cd $DEPLOY_DIR && tar -xzf $TARBALL_NAME && chmod -R 755 ."

# Set up backend environment file with production settings
echo "Setting up production environment on VM..."
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "cd $DEPLOY_DIR && cp .env.production backend/.env"

# Update CORS settings in backend config
echo "Updating backend CORS settings..."
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "cd $DEPLOY_DIR && cat > backend/cors_update.py << EOF
#!/usr/bin/env python3
with open('backend/config.py', 'r') as f:
    config = f.read()

# Update ALLOWED_ORIGINS to include VM IP
import re
pattern = r'ADMIN_ALLOWED_ORIGINS\s*=\s*\['
replacement = f'ADMIN_ALLOWED_ORIGINS = [\n    \"http://${VM_IP}\", \"http://${VM_IP}:80\", \"http://${VM_IP}:8000\", \"http://${VM_IP}:5173\",'
config = re.sub(pattern, replacement, config)

with open('backend/config.py', 'w') as f:
    f.write(config)
EOF
chmod +x backend/cors_update.py
python3 backend/cors_update.py
rm backend/cors_update.py"

# Check if virtual environment exists and requirements have changed
echo "Checking Python dependencies..."
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "cd $DEPLOY_DIR && 
    if [ ! -d '.venv' ] || [ ! -f '.venv/requirements.hash' ] || [ \"\$(md5sum requirements.txt | cut -d' ' -f1)\" != \"\$(cat .venv/requirements.hash)\" ]; then
        echo 'Installing Python dependencies...'
        python3 -m venv .venv
        source .venv/bin/activate
        pip install -r requirements.txt
        pip install -r backend/requirements.txt
        md5sum requirements.txt > .venv/requirements.hash
    else
        echo 'Python dependencies are up to date'
    fi"

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
ExecStart=$DEPLOY_DIR/.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
Restart=always
Environment=\"PATH=$DEPLOY_DIR/.venv/bin:/usr/bin\"

[Install]
WantedBy=multi-user.target
EOF"

# Start the services
echo "Starting services..."
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo systemctl daemon-reload && sudo systemctl enable peerai-backend && sudo systemctl restart peerai-backend"

# Add nginx configuration to serve the frontend
echo "Setting up nginx to serve the frontend..."
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo apt-get update && sudo apt-get install -y nginx"
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo tee /etc/nginx/sites-available/peerai > /dev/null << 'EOF'
server {
    listen 80;
    server_name ${VM_IP};

    root $DEPLOY_DIR/frontend/admin-dashboard/dist;
    index index.html;

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8000/health;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # API endpoints
    location /api/v1/ {
        proxy_pass http://localhost:8000/api/v1/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Add CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,X-API-Key' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;

        # Handle OPTIONS requests
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,X-API-Key';
            add_header 'Access-Control-Max-Age' '1728000';
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' '0';
            return 204;
        }
    }

    # Frontend routes
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header 'Cache-Control' 'no-cache, no-store, must-revalidate';
        add_header 'Pragma' 'no-cache';
        add_header 'Expires' '0';
    }

    # Detailed error logs
    error_log /var/log/nginx/peerai_error.log debug;
    access_log /var/log/nginx/peerai_access.log;
}
EOF"

# Fix nginx config variables
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo sed -i 's|\${VM_IP}|$VM_IP|g' /etc/nginx/sites-available/peerai"
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo sed -i 's|\$DEPLOY_DIR|$DEPLOY_DIR|g' /etc/nginx/sites-available/peerai"
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo sed -i 's|\\\\$uri|\$uri|g' /etc/nginx/sites-available/peerai"
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo sed -i 's|\\\\$host|\$host|g' /etc/nginx/sites-available/peerai"
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo sed -i 's|\\\\$remote_addr|\$remote_addr|g' /etc/nginx/sites-available/peerai"
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo sed -i 's|\\\\$proxy_add_x_forwarded_for|\$proxy_add_x_forwarded_for|g' /etc/nginx/sites-available/peerai"
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo sed -i 's|\\\\$scheme|\$scheme|g' /etc/nginx/sites-available/peerai"
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo sed -i 's|\\\\$request_method|\$request_method|g' /etc/nginx/sites-available/peerai"

# Ensure nginx sites-enabled has our config and remove default if it exists
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo rm -f /etc/nginx/sites-enabled/default && sudo ln -sf /etc/nginx/sites-available/peerai /etc/nginx/sites-enabled/"

# Set proper permissions for nginx access
echo "Setting up proper permissions for nginx..."
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo chown -R www-data:www-data $DEPLOY_DIR && sudo chmod -R 755 $DEPLOY_DIR && sudo chmod 755 /home/ubuntu && sudo systemctl restart nginx"

# Test and restart nginx
ssh -i "$SSH_KEY" "$SSH_USER@$VM_IP" "sudo nginx -t && sudo systemctl restart nginx"

# Clean up local tarball
echo "Cleaning up local tarball..."
rm "$TARBALL_NAME"

echo "Deployment complete!"
echo "Frontend available at: http://${VM_IP}"
echo "Backend API available at: http://${VM_IP}/api/v1"
echo "Raw backend access at: http://${VM_IP}:8000" 