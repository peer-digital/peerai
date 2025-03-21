#!/bin/bash
set -e

# Main deployment script for PeerAI
echo "=== Starting PeerAI deployment ==="

# Clean up before deployment
echo "=== Cleaning up before deployment ==="
# Stop running services
sudo systemctl stop peerai-backend 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true

# Clean existing directories but maintain structure
echo "=== Removing old deployment files ==="
rm -rf ~/peer-ai/backend/*
rm -rf ~/peer-ai/frontend/admin-dashboard/dist/*
mkdir -p ~/peer-ai/deployment
mkdir -p ~/peer-ai/logs

# Create project directories if they don't exist
mkdir -p ~/peer-ai/frontend/admin-dashboard/dist
mkdir -p ~/peer-ai/backend
mkdir -p ~/peer-ai/deployment

# Deploy backend code
echo "=== Deploying backend code ==="

# Check paths for backend code tarball
if [ -f "/home/ubuntu/backend-code.tar.gz" ]; then
  echo "Extracting backend code from home directory tarball..."
  tar -xzf /home/ubuntu/backend-code.tar.gz -C ~/peer-ai/
elif [ -f "../../backend-code.tar.gz" ]; then
  echo "Extracting backend code from relative path (../../)..."
  tar -xzf ../../backend-code.tar.gz -C ~/peer-ai/
elif [ -f "../backend-code.tar.gz" ]; then
  echo "Extracting backend code from parent directory..."
  tar -xzf ../backend-code.tar.gz -C ~/peer-ai/
elif [ -f "./backend-code.tar.gz" ]; then
  echo "Extracting backend code from current directory..."
  tar -xzf ./backend-code.tar.gz -C ~/peer-ai/
else
  echo "ERROR: Backend code tarball not found, checking other locations..."
  # If it wasn't packaged as a tarball, check if there's a backend directory
  if [ -d "../../backend" ]; then
    echo "Found backend directory at ../../backend, copying files..."
    cp -r ../../backend/* ~/peer-ai/backend/
  elif [ -d "../backend" ]; then
    echo "Found backend directory at ../backend, copying files..."
    cp -r ../backend/* ~/peer-ai/backend/
  elif [ -d "./backend" ]; then
    echo "Found backend directory at ./backend, copying files..."
    cp -r ./backend/* ~/peer-ai/backend/
  else
    ls -la ~/ || true
    ls -la . || true
    ls -la .. || true
    ls -la ../.. || true
    echo "ERROR: Backend code not found in any location."
    echo "Directory structure:"
    find ~/ -type d -maxdepth 2 || true
    exit 1
  fi
fi

# Deploy frontend
echo "=== Deploying frontend ==="

# Check paths for frontend build tarball
if [ -f "/home/ubuntu/frontend-build.tar.gz" ]; then
  echo "Extracting frontend build from home directory tarball..."
  tar -xzf /home/ubuntu/frontend-build.tar.gz -C ~/peer-ai/frontend/admin-dashboard/
elif [ -f "../../frontend-build.tar.gz" ]; then
  echo "Extracting frontend build from relative path (../../)..."
  tar -xzf ../../frontend-build.tar.gz -C ~/peer-ai/frontend/admin-dashboard/
elif [ -f "../frontend-build.tar.gz" ]; then
  echo "Extracting frontend build from parent directory..."
  tar -xzf ../frontend-build.tar.gz -C ~/peer-ai/frontend/admin-dashboard/
elif [ -f "./frontend-build.tar.gz" ]; then
  echo "Extracting frontend build from current directory..."
  tar -xzf ./frontend-build.tar.gz -C ~/peer-ai/frontend/admin-dashboard/
else
  echo "ERROR: Frontend build tarball not found, checking other locations..."
  # If it wasn't packaged as a tarball, check if there's a dist directory
  if [ -d "../../frontend/admin-dashboard/dist" ]; then
    echo "Found frontend build at ../../frontend/admin-dashboard/dist, copying files..."
    cp -r ../../frontend/admin-dashboard/dist/* ~/peer-ai/frontend/admin-dashboard/dist/
  elif [ -d "../frontend/admin-dashboard/dist" ]; then
    echo "Found frontend build at ../frontend/admin-dashboard/dist, copying files..."
    cp -r ../frontend/admin-dashboard/dist/* ~/peer-ai/frontend/admin-dashboard/dist/
  elif [ -d "./frontend/admin-dashboard/dist" ]; then
    echo "Found frontend build at ./frontend/admin-dashboard/dist, copying files..."
    cp -r ./frontend/admin-dashboard/dist/* ~/peer-ai/frontend/admin-dashboard/dist/
  else
    echo "WARNING: Frontend build not found."
  fi
fi

# Setup backend environment
echo "=== Setting up backend environment ==="
cd ~/peer-ai/backend
if [ ! -d "venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Copy environment file if it exists
if [ -f "/home/ubuntu/.env.example" ]; then
  echo "Copying environment file from home directory..."
  cp /home/ubuntu/.env.example ~/peer-ai/backend/.env
elif [ -f "../../.env.example" ]; then
  echo "Copying environment file from relative path (../../)..."
  cp ../../.env.example ~/peer-ai/backend/.env
elif [ -f "../.env.example" ]; then
  echo "Copying environment file from parent directory..."
  cp ../.env.example ~/peer-ai/backend/.env
elif [ -f "./.env.example" ]; then
  echo "Copying environment file from current directory..."
  cp ./.env.example ~/peer-ai/backend/.env
else
  echo "WARNING: No .env file found. Creating a basic one..."
  cat > ~/peer-ai/backend/.env << 'EOF'
# Basic environment file
DATABASE_URL=postgresql://peerai:peerai_password@localhost:5432/peerai_db
JWT_SECRET_KEY=change_me_in_production
ENVIRONMENT=production
DEBUG=false
EOF
fi

# Ensure nginx config exists
echo "=== Setting up nginx configuration ==="
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
echo "=== Applying nginx configuration ==="
sudo cp ~/peer-ai/deployment/nginx-config.conf /etc/nginx/sites-available/peerai
sudo ln -sf /etc/nginx/sites-available/peerai /etc/nginx/sites-enabled/default

# Remove default nginx site if it exists
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/peerai /etc/nginx/sites-enabled/peerai

# Install required packages if missing
echo "=== Checking required packages ==="
if ! command -v nginx &> /dev/null; then
  echo "Installing nginx..."
  sudo apt-get update
  sudo apt-get install -y nginx
fi

# Setup backend service
echo "=== Setting up backend service ==="
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
echo "=== Restarting services ==="
sudo systemctl restart nginx || {
  echo "ERROR: Failed to restart nginx. Checking configuration..."
  sudo nginx -t
  exit 1
}

sudo systemctl restart peerai-backend || {
  echo "ERROR: Failed to restart backend service. Checking logs..."
  sudo systemctl status peerai-backend
  exit 1
}

# Check if services are running
echo "=== Checking service status ==="
sudo systemctl status nginx --no-pager
sudo systemctl status peerai-backend --no-pager

# Clean up temporary files
echo "=== Cleaning up temporary files ==="
rm -f ~/backend-code.tar.gz
rm -f ~/frontend-build.tar.gz
rm -f ~/scripts.tar.gz
rm -rf ~/deploy-temp

echo "=== Deployment completed successfully! ==="
echo "Frontend available at: http://$(hostname -I | awk '{print $1}')"
echo "API available at: http://$(hostname -I | awk '{print $1}')/api" 