#!/bin/bash
set -e

# Script to set up the server environment for PeerAI deployment
echo "Setting up PeerAI server environment..."

# Create project directories
mkdir -p ~/peer-ai/frontend/admin-dashboard/dist
mkdir -p ~/peer-ai/backend
mkdir -p ~/peer-ai/deployment/ssl

# Install nginx
echo "Installing nginx..."
sudo apt-get update
sudo apt-get install -y nginx

# Create nginx configuration
cat > ~/peer-ai/deployment/nginx-config.conf << 'EOF'
server {
    listen 80;
    server_name _;

    # API routes - forward to backend
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Set timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # OpenAPI documentation
    location /docs {
        proxy_pass http://localhost:8000/docs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8000/health;
        access_log off;
        add_header Content-Type application/json;
    }

    # Frontend app - serve static files
    location / {
        root /home/ubuntu/peer-ai/frontend/admin-dashboard/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Apply nginx configuration
sudo cp ~/peer-ai/deployment/nginx-config.conf /etc/nginx/sites-available/peerai
sudo ln -sf /etc/nginx/sites-available/peerai /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

# Install Python and dependencies
echo "Setting up Python environment..."
sudo apt-get install -y python3-pip python3-venv

# Create systemd service for backend
echo "Creating backend service..."
sudo tee /etc/systemd/system/peerai-backend.service > /dev/null << 'EOF'
[Unit]
Description=PeerAI Backend Service
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/peer-ai/backend
Environment="PATH=/home/ubuntu/peer-ai/backend/venv/bin"
ExecStart=/home/ubuntu/peer-ai/backend/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable peerai-backend

echo "Server environment setup complete!"
echo "Next steps:"
echo "1. Deploy backend code"
echo "2. Deploy frontend build"
echo "3. Start the backend service: sudo systemctl start peerai-backend" 