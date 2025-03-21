#!/bin/bash
set -e

# Script to set up the server environment for PeerAI deployment
echo "Setting up PeerAI server environment..."

# Create project directories
mkdir -p ~/peer-ai/frontend/admin-dashboard/dist
mkdir -p ~/peer-ai/backend
mkdir -p ~/peer-ai/deployment
mkdir -p ~/peer-ai/logs

# Install dependencies
echo "Installing required packages..."
sudo apt-get update
sudo apt-get install -y nginx python3-pip python3-venv

# Create nginx configuration
echo "Creating nginx configuration..."
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
echo "Applying nginx configuration..."
sudo cp ~/peer-ai/deployment/nginx-config.conf /etc/nginx/sites-available/peerai
sudo ln -sf /etc/nginx/sites-available/peerai /etc/nginx/sites-enabled/default

# Add default backend service
echo "Creating backend systemd service..."
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

# Reload systemd
sudo systemctl daemon-reload
sudo systemctl enable peerai-backend

# Create logs directory
mkdir -p ~/peer-ai/logs
touch ~/peer-ai/logs/backend.log
touch ~/peer-ai/logs/frontend.log

# Setup logrotate for log files
sudo tee /etc/logrotate.d/peerai > /dev/null << 'EOF'
/home/ubuntu/peer-ai/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
}
EOF

echo "Server environment setup completed!"
echo "Next steps:"
echo "1. Upload your backend code to ~/peer-ai/backend/"
echo "2. Upload your frontend build to ~/peer-ai/frontend/admin-dashboard/dist/"
echo "3. Set up a Python virtual environment in ~/peer-ai/backend/"
echo "4. Install dependencies with pip install -r requirements.txt"
echo "5. Start the backend service with: sudo systemctl start peerai-backend"
echo "6. Restart nginx with: sudo systemctl restart nginx" 