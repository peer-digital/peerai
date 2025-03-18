#!/bin/bash
set -e

# @important: Define the NGINX configuration file path
NGINX_CONF="/etc/nginx/sites-available/peerai"

echo "Fixing NGINX configuration..."
echo "Checking current configuration..."

# Check if the file exists
if [ ! -f "$NGINX_CONF" ]; then
    echo "Error: NGINX configuration file not found at $NGINX_CONF"
    exit 1
fi

# Make a backup of the current configuration
sudo cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%s)"
echo "Backup created."

# Replace the proxy_pass directive for /api/
sudo sed -i 's|proxy_pass http://localhost:8000/;|proxy_pass http://localhost:8000/api/;|g' "$NGINX_CONF"
echo "Updated proxy_pass directive."

# Test the NGINX configuration
echo "Testing NGINX configuration..."
if ! sudo nginx -t; then
    echo "NGINX configuration test failed. Reverting changes..."
    sudo cp "${NGINX_CONF}.bak.$(ls -t ${NGINX_CONF}.bak.* | head -1 | xargs basename)" "$NGINX_CONF"
    echo "Changes reverted."
    exit 1
fi

# Reload NGINX
echo "Reloading NGINX..."
sudo systemctl reload nginx

echo "NGINX configuration updated and reloaded successfully."
echo "Changes made:"
echo "  - Changed proxy_pass for /api/ from http://localhost:8000/ to http://localhost:8000/api/"

# Check NGINX error log
echo "Checking NGINX error log..."
sudo tail -n 10 /var/log/nginx/error.log

echo "Done!" 