#!/bin/bash
set -e

# Define variables
SERVER_IP="158.174.210.91"
BACKEND_SERVICE="peerai.service"

echo "Checking deployment status..."

# Check if the backend service is running
echo "Checking backend service status..."
if systemctl is-active --quiet $BACKEND_SERVICE; then
    echo "✅ Backend service is running"
else
    echo "❌ Backend service is not running"
    echo "Service status:"
    systemctl status $BACKEND_SERVICE --no-pager
fi

# Check if nginx is running
echo "Checking nginx status..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is not running"
    echo "Service status:"
    systemctl status nginx --no-pager
fi

# Check if PostgreSQL is running
echo "Checking PostgreSQL status..."
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL is not running"
    echo "Service status:"
    systemctl status postgresql --no-pager
fi

# Check if the frontend is accessible
echo "Checking frontend accessibility..."
if curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP/ | grep -q "200\|301\|302"; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend is not accessible"
fi

# Check if the backend API is accessible
echo "Checking backend API accessibility..."
if curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP/health | grep -q "200"; then
    echo "✅ Backend API is accessible"
else
    echo "❌ Backend API is not accessible"
fi

echo "Deployment status check completed" 