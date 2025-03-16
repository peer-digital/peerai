#!/bin/bash
set -e

echo "Starting Nginx configuration cleanup and fix..."

# Backup the current configurations
echo "Backing up current Nginx configurations..."
sudo mkdir -p /etc/nginx/backup-$(date +%Y%m%d)
sudo cp -r /etc/nginx/sites-available/* /etc/nginx/backup-$(date +%Y%m%d)/ 2>/dev/null || true
sudo cp -r /etc/nginx/sites-enabled/* /etc/nginx/backup-$(date +%Y%m%d)/ 2>/dev/null || true
sudo cp -r /etc/nginx/conf.d/* /etc/nginx/backup-$(date +%Y%m%d)/ 2>/dev/null || true

# Remove all existing configurations to avoid conflicts
echo "Removing existing configuration files..."
sudo rm -f /etc/nginx/sites-enabled/*
sudo rm -f /etc/nginx/conf.d/api_fix.conf 2>/dev/null || true
sudo rm -f /etc/nginx/conf.d/form_login_redirect.conf 2>/dev/null || true
sudo rm -f /etc/nginx/conf.d/login_fix.conf 2>/dev/null || true
sudo rm -f /etc/nginx/conf.d/login_transform.conf 2>/dev/null || true

# Create a clean, consolidated configuration
echo "Creating new consolidated Nginx configuration..."
sudo tee /etc/nginx/sites-available/peerai > /dev/null << 'EOL'
server {
    listen 80 default_server;
    server_name _;

    # Set proper root directory and index
    root /home/ubuntu/peer-ai/frontend/dist;
    index index.html;
    
    # CORS configuration for all API endpoints
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
    
    # Handle OPTIONS requests for CORS
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }

    # Frontend - Fix try_files directive to prevent redirection loops
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Form-compatible login endpoint - specific match
    location = /api/v1/auth/login-form {
        proxy_pass http://localhost:8000/api/v1/auth/login-form;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
        proxy_buffering off;
        proxy_http_version 1.1;
    }

    # API v1 auth login endpoint - must come before other API endpoints
    location = /api/v1/auth/login {
        proxy_pass http://localhost:8000/api/v1/auth/login;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
        proxy_buffering off;
        proxy_http_version 1.1;
    }

    # API v1 auth me endpoint - specific match
    location = /api/v1/auth/me {
        proxy_pass http://localhost:8000/api/v1/auth/me;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
        proxy_buffering off;
        proxy_http_version 1.1;
    }

    # Direct match for API v1 endpoint (without trailing slash)
    location = /api/v1 {
        proxy_pass http://localhost:8000/api/v1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
        proxy_buffering off;
        proxy_http_version 1.1;
    }
    
    # API v1 auth endpoints - general
    location ^~ /api/v1/auth/ {
        proxy_pass http://localhost:8000/api/v1/auth/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
        proxy_buffering off;
        proxy_http_version 1.1;
    }

    # API v1 endpoints
    location ^~ /api/v1/ {
        proxy_pass http://localhost:8000/api/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
        proxy_buffering off;
        proxy_http_version 1.1;
    }

    # Backend API endpoints (fallback for non-versioned endpoints)
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
    }

    # Auth endpoints (direct access)
    location /auth/ {
        proxy_pass http://localhost:8000/auth/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
    }

    # Log configuration
    access_log /var/log/nginx/peerai_access.log;
    error_log /var/log/nginx/peerai_error.log;
}
EOL

# Enable the new configuration
echo "Enabling new configuration..."
sudo ln -sf /etc/nginx/sites-available/peerai /etc/nginx/sites-enabled/

# Test Nginx configuration before reload
echo "Testing Nginx configuration..."
if sudo nginx -t; then
    echo "Nginx configuration test passed. Reloading Nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx configuration has been fixed and reloaded successfully."
else
    echo "❌ Nginx configuration test failed. Please check the error above."
    exit 1
fi

# Fix backend service
echo "Ensuring backend service is running properly..."
cd /home/ubuntu/peer-ai/backend

# Check if backend is running
if ! curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo "Backend is not responding. Restarting backend service..."
    
    # Check if there's a running uvicorn process
    if pgrep -f uvicorn; then
        echo "Stopping current uvicorn processes..."
        pkill -f uvicorn || echo "No uvicorn processes found"
    fi
    
    # Activate virtual environment and start backend 
    source venv/bin/activate
    
    # Start backend as a systemd service
    sudo systemctl daemon-reload
    sudo systemctl restart peerai.service
    sleep 5
    
    # Check if service started properly
    if systemctl is-active --quiet peerai.service; then
        echo "✅ Backend service started successfully through systemd."
    else
        echo "❌ Backend service failed to start through systemd. Starting manually..."
        nohup python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --log-level info > /home/ubuntu/peer-ai/logs/backend_manual.log 2>&1 &
        echo $! > /home/ubuntu/peer-ai/backend.pid
        echo "Backend started manually as process $(cat /home/ubuntu/peer-ai/backend.pid)"
        sleep 5
    fi
fi

# Final verification
echo "Performing final verification..."
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo "✅ Backend health check: PASSED"
else
    echo "❌ Backend health check: FAILED"
fi

if curl -s http://localhost:8000/api/v1 | grep -q "PeerAI API v1"; then
    echo "✅ API v1 endpoint: PASSED"
else
    echo "❌ API v1 endpoint: FAILED"
fi

LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d '{"email":"super.admin@peerai.se","password":"superadmin123"}' http://localhost:8000/api/v1/auth/login)
if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    echo "✅ Login endpoint: PASSED"
else
    echo "❌ Login endpoint: FAILED"
    echo "Response: $LOGIN_RESPONSE"
fi

echo "Nginx and backend configuration fix completed." 