#!/bin/bash

# check_deployment.sh - Verify deployment status on the VM
# @description: Checks if the deployment was successful by verifying service status,
#               frontend build, backend environment, and service accessibility.

# Stop script on errors
set -e

echo "Starting deployment verification..."

# --- Check if service is running ---
echo "Checking peerai-backend service status..."
if ! systemctl is-active --quiet peerai-backend.service; then
    echo "ERROR: peerai-backend service is not running!"
    echo "Service status:"
    systemctl status peerai-backend.service --no-pager
    exit 1
fi
echo "✓ Service is running"

# --- Check frontend build ---
echo "Checking frontend build..."
if [ ! -d "frontend/admin-dashboard/dist" ]; then
    echo "ERROR: Frontend build directory not found!"
    exit 1
fi
echo "✓ Frontend build present"

# --- Check backend environment ---
echo "Checking backend environment..."
if [ ! -f ".venv/bin/uvicorn" ]; then
    echo "ERROR: Backend virtual environment not properly set up!"
    echo "Missing uvicorn executable"
    exit 1
fi
echo "✓ Backend environment verified"

# --- Check environment variables configured for the service ---
echo "Checking critical environment variables configured for peerai-backend.service..."
required_vars=(
    "DATABASE_URL"
    "JWT_SECRET_KEY"
    "GOOGLE_APPLICATION_CREDENTIALS"
)

# Get the environment variables string from systemd
service_env=$(systemctl show peerai-backend.service --property=Environment --value)

# Check if each required variable is present in the systemd Environment string
for var in "${required_vars[@]}"; do
    # Check if the string contains "VARNAME=" or 'VARNAME='
    # Use grep -q for silent checking
    if ! echo "$service_env" | grep -q -E "(${var}=|'${var}=)"; then
        echo "ERROR: Required environment variable $var does not appear to be set in systemd configuration for peerai-backend.service!"
        echo "Systemd Environment string: $service_env"
        exit 1
    fi
done
echo "✓ Critical environment variables seem configured in systemd"

# --- Check service accessibility ---
echo "Checking service accessibility..."
echo "Waiting 5 seconds for service to fully start..."
sleep 5

PORT=8000
if ! curl --fail --silent --max-time 5 "http://localhost:$PORT/health" > /dev/null; then
    echo "ERROR: Service is not accessible on port $PORT!"
    echo "Checking service logs:"
    journalctl -u peerai-backend.service -n 50 --no-pager
    exit 1
fi
echo "✓ Service is accessible"

# --- Check SSL certificates ---
echo "Checking SSL certificates..."
SSL_CERT_PATH="/etc/letsencrypt/live/app.peerdigital.se"
if [ ! -d "$SSL_CERT_PATH" ]; then
    echo "WARNING: SSL certificates not found at $SSL_CERT_PATH."
    echo "Run the ssl_check.sh script to install SSL certificates."
else
    # Check certificate expiration
    EXPIRY=$(sudo openssl x509 -enddate -noout -in "$SSL_CERT_PATH/fullchain.pem" | cut -d= -f2)
    echo "Certificate expires on: $EXPIRY"

    # Check if certificate is valid for at least 30 days
    if ! sudo openssl x509 -enddate -noout -in "$SSL_CERT_PATH/fullchain.pem" -checkend 2592000; then
        echo "WARNING: Certificate will expire within 30 days. Consider renewing."
    else
        echo "✓ SSL certificates are valid and not expiring soon"
    fi

    # Check if Nginx is configured to use SSL
    if ! grep -q "ssl_certificate" /etc/nginx/conf.d/peerai.conf; then
        echo "WARNING: Nginx is not configured to use SSL. Run the ssl_check.sh script to fix this."
    else
        echo "✓ Nginx is configured to use SSL"
    fi
fi

echo "Deployment verification completed successfully!"