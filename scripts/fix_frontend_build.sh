#!/bin/bash
set -e

# Define variables
VM_IP="158.174.210.91"
VM_USER="ubuntu"
SSH_KEY_FILE="$HOME/.ssh/peerai_vm_key"

# Check if SSH key exists, if not, set it up
if [ ! -f "$SSH_KEY_FILE" ]; then
    echo "SSH key not found. Setting up SSH key..."
    ./scripts/setup_ssh_key.sh
fi

echo "Fixing frontend build and service configuration issues on VM at $VM_IP..."

# SSH into the VM and fix the issues
ssh -i "$SSH_KEY_FILE" $VM_USER@$VM_IP << 'EOF'
cd /home/ubuntu/peer-ai

# Fix frontend build memory issues
cd /home/ubuntu/peer-ai/frontend/admin-dashboard

# Increase Node.js memory limit for the build
echo "Increasing Node.js memory limit for the build..."
export NODE_OPTIONS="--max-old-space-size=4096"

# Install dependencies with clean cache
echo "Cleaning npm cache and reinstalling dependencies..."
npm cache clean --force
rm -rf node_modules
npm install

# Build with increased memory
echo "Building frontend with increased memory..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Create Nginx configuration if it doesn't exist
echo "Setting up Nginx configuration..."
if [ ! -f "/etc/nginx/sites-available/peerai" ]; then
    echo "Creating Nginx configuration..."
    sudo tee /etc/nginx/sites-available/peerai > /dev/null << 'NGINX_CONF'
server {
    listen 80;
    server_name _;

    location / {
        root /home/ubuntu/peer-ai/frontend/admin-dashboard/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_CONF

    # Enable the site
    sudo ln -s /etc/nginx/sites-available/peerai /etc/nginx/sites-enabled/peerai
    
    # Test and reload Nginx
    sudo nginx -t && sudo systemctl reload nginx
fi

# Create systemd service file if it doesn't exist
echo "Setting up systemd service..."
if [ ! -f "/etc/systemd/system/peerai.service" ]; then
    echo "Creating systemd service file..."
    sudo tee /etc/systemd/system/peerai.service > /dev/null << 'SYSTEMD_CONF'
[Unit]
Description=Peer AI Backend Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/peer-ai/backend
Environment="PATH=/home/ubuntu/peer-ai/backend/venv/bin"
Environment="DATABASE_URL=postgresql://peerai:peerai_password@localhost:5432/peerai_db"
ExecStart=/home/ubuntu/peer-ai/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
SYSTEMD_CONF

    # Reload systemd, enable and start the service
    sudo systemctl daemon-reload
    sudo systemctl enable peerai.service
    sudo systemctl start peerai.service
fi

# Check service status
echo "Checking service status..."
sudo systemctl status peerai.service || true

# Check Nginx status
echo "Checking Nginx status..."
sudo systemctl status nginx || true

echo "Fix completed!"
EOF 