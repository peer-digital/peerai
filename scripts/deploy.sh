#!/bin/bash
set -e

# Main deployment script for PeerAI
echo "Starting PeerAI deployment..."

# Create project directories if they don't exist
mkdir -p ~/peer-ai/frontend/admin-dashboard/dist
mkdir -p ~/peer-ai/backend
mkdir -p ~/peer-ai/deployment

# Deploy backend code
echo "Deploying backend code..."

# Extract backend code if it exists as tarball
if [ -f "backend-code.tar.gz" ]; then
  echo "Extracting backend code from tarball..."
  tar -xzf backend-code.tar.gz -C ~/peer-ai/
else
  # Check if backend code exists in current directory
  if [ -d "backend" ]; then
    echo "Copying backend code from current directory..."
    cp -r backend/* ~/peer-ai/backend/
  else
    echo "Error: Backend code not found."
    exit 1
  fi
fi

# Extract frontend build if it exists as tarball
if [ -f "frontend-build.tar.gz" ]; then
  echo "Extracting frontend build from tarball..."
  tar -xzf frontend-build.tar.gz -C ~/peer-ai/frontend/admin-dashboard/
else
  # Check if frontend build exists in current directory
  if [ -d "frontend/admin-dashboard/dist" ]; then
    echo "Copying frontend build from current directory..."
    cp -r frontend/admin-dashboard/dist/* ~/peer-ai/frontend/admin-dashboard/dist/
  else
    echo "Error: Frontend build not found."
    exit 1
  fi
fi

# Setup backend environment
echo "Setting up backend environment..."
cd ~/peer-ai/backend
if [ ! -d "venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Copy environment file if it exists
if [ -f ~/.env.example ]; then
  echo "Copying environment file..."
  cp ~/.env.example ~/peer-ai/backend/.env
fi

# Ensure nginx config exists
echo "Setting up nginx configuration..."
mkdir -p ~/peer-ai/deployment
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

# Setup backend service
echo "Setting up backend service..."
cat > ~/peer-ai/deployment/peerai-backend.service << 'EOF'
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

# Install service
sudo cp ~/peer-ai/deployment/peerai-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable peerai-backend

# Restart services
echo "Restarting services..."
sudo systemctl restart nginx
sudo systemctl restart peerai-backend

# Check if services are running
echo "Checking service status..."
sudo systemctl status nginx --no-pager
sudo systemctl status peerai-backend --no-pager

echo "Deployment completed successfully!"
echo "Frontend available at: http://$(hostname -I | awk '{print $1}')"
echo "API available at: http://$(hostname -I | awk '{print $1}')/api" 