#!/bin/bash
set -e

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
SERVER_IP="158.174.210.91" # @note: Production server IP address

echo "Checking deployment status..."

# Function to check if a service is running
check_service() {
    local service_name="$1"
    if systemctl is-active --quiet "$service_name"; then
        echo "✅ $service_name is running"
        return 0
    else
        echo "❌ $service_name is not running"
        echo "Service status:"
        systemctl status "$service_name" | head -n 20
        return 1
    fi
}

# Check backend service status
echo "Checking backend service status..."
check_service "peerai.service" || {
    echo "Checking backend logs..."
    journalctl -u peerai.service --no-pager -n 50
}

# Check Nginx status
echo "Checking Nginx status..."
check_service "nginx.service" || {
    echo "Checking Nginx configuration..."
    nginx -t
    echo "Checking Nginx logs..."
    tail -n 50 /var/log/nginx/error.log
}

# Check PostgreSQL status
echo "Checking PostgreSQL status..."
check_service "postgresql.service" || {
    echo "Checking PostgreSQL logs..."
    tail -n 50 /var/log/postgresql/postgresql-16-main.log
}

# Check if frontend files exist
echo "Checking frontend files..."
if [ -d "$FRONTEND_DIR/dist" ]; then
    echo "✅ Frontend files exist"
    ls -la "$FRONTEND_DIR/dist"
else
    echo "❌ Frontend files not found"
fi

# Check if backend files exist
echo "Checking backend files..."
if [ -d "$BACKEND_DIR/backend" ]; then
    echo "✅ Backend files exist"
    ls -la "$BACKEND_DIR/backend"
else
    echo "❌ Backend files not found"
fi

# Check frontend accessibility
echo "Checking frontend accessibility..."
if curl -s --head --fail "http://$SERVER_IP" > /dev/null; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend is not accessible"
    echo "Checking Nginx configuration for frontend..."
    grep -A 10 "location /" /etc/nginx/sites-available/peerai
fi

# Check backend API accessibility
echo "Checking backend API accessibility..."
if curl -s --fail "http://$SERVER_IP/api" > /dev/null; then
    echo "✅ Backend API is accessible"
else
    echo "❌ Backend API is not accessible"
    echo "Checking Nginx configuration for backend API..."
    grep -A 10 "location /api" /etc/nginx/sites-available/peerai
    echo "Checking if backend service is listening on port 8000..."
    ss -tulpn | grep 8000 || echo "No process is listening on port 8000"
fi

# Check database connection
echo "Checking database connection..."
if sudo -u postgres psql -c "SELECT 1" peerai_db > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    echo "Checking PostgreSQL configuration..."
    sudo -u postgres psql -c "SELECT * FROM pg_hba_file_rules"
fi

# Check network connectivity
echo "Checking network connectivity..."
echo "Listening ports:"
ss -tulpn

echo "Firewall status:"
sudo ufw status

echo "Deployment check completed!" 