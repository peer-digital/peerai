#!/bin/bash

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/peerai > /dev/null << 'EOF'
server {
    listen 80;
    server_name 158.174.210.91;
    
    # Set proper root directory and index
    root /home/ubuntu/peer-ai/backend/static/admin-dashboard;
    index index.html;
    
    # Frontend - Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API v1 endpoints
    location ^~ /api/v1/ {
        proxy_pass http://localhost:8000/api/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API endpoints (fallback for non-versioned endpoints)
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Test and reload Nginx
sudo nginx -t && sudo systemctl restart nginx
echo "Nginx configuration updated and reloaded" 