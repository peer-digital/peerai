#!/bin/bash

# ssl_check.sh - Check and fix SSL certificates for PeerAI
# This script checks if SSL certificates are properly configured and reinstalls them if needed

# Stop script on errors
set -e

DOMAIN="app.peerdigital.se"
NGINX_CONF="/etc/nginx/conf.d/peerai.conf"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"

echo "Checking SSL certificate for $DOMAIN..."

# Check if certificates exist
if [ ! -d "$CERT_PATH" ]; then
    echo "SSL certificates not found. Installing with Certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@peerdigital.se
    echo "SSL certificates installed successfully."
else
    echo "SSL certificates found at $CERT_PATH."
    # Check certificate expiration
    EXPIRY=$(sudo openssl x509 -enddate -noout -in "$CERT_PATH/fullchain.pem" | cut -d= -f2)
    echo "Certificate expires on: $EXPIRY"
    
    # Check if certificate is valid for at least 30 days
    EXPIRY_SECONDS=$(sudo openssl x509 -enddate -noout -in "$CERT_PATH/fullchain.pem" -checkend 2592000)
    if [ $? -ne 0 ]; then
        echo "Certificate will expire soon. Renewing..."
        sudo certbot renew
    fi
fi

# Check if Nginx config includes SSL settings
if ! grep -q "ssl_certificate" "$NGINX_CONF"; then
    echo "Nginx configuration does not include SSL settings. Updating..."
    
    # Backup current config
    sudo cp "$NGINX_CONF" "${NGINX_CONF}.bak"
    
    # Update Nginx config to include SSL settings
    sudo tee "$NGINX_CONF" > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Redirect HTTP to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name $DOMAIN;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend static files
    root /home/ubuntu/peer-ai/frontend/admin-dashboard/dist;
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
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
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
EOF
    
    echo "Nginx configuration updated with SSL settings."
fi

# Test Nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t

# Reload Nginx if test is successful
if [ $? -eq 0 ]; then
    echo "Reloading Nginx..."
    sudo systemctl reload nginx
    echo "SSL configuration completed successfully."
else
    echo "ERROR: Nginx configuration test failed. Please check the configuration."
    exit 1
fi
