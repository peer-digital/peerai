#!/bin/bash
set -e

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
SERVER_IP="158.174.210.91" # @note: Production server IP address

echo "Checking deployment status..."

# Check if backend service is running
echo "Checking backend service status..."
if systemctl is-active --quiet peerai.service; then
    echo "✅ Backend service is running"
else
    echo "❌ Backend service is not running"
    sudo systemctl status peerai.service
fi

# Check if Nginx is running
echo "Checking Nginx status..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is not running"
    sudo systemctl status nginx
fi

# Check if PostgreSQL is running
echo "Checking PostgreSQL status..."
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL is not running"
    sudo systemctl status postgresql
fi

# Check if frontend is accessible
echo "Checking frontend accessibility..."
if curl -s --head --request GET http://$SERVER_IP | grep "200 OK" > /dev/null; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend is not accessible"
fi

# Check if backend API is accessible
echo "Checking backend API accessibility..."
if curl -s --head --request GET http://$SERVER_IP/api/health | grep "200 OK" > /dev/null; then
    echo "✅ Backend API is accessible"
else
    echo "❌ Backend API is not accessible"
fi

# Check database connection
echo "Checking database connection..."
cd "$APP_DIR/backend"
source venv/bin/activate

python - <<EOF
import os
from sqlalchemy import create_engine, text

try:
    # Get database URL from environment or use default
    DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://peerai:peerai_password@localhost:5432/peerai_db')
    
    # Create engine and connect
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text('SELECT 1')).fetchone()
        if result and result[0] == 1:
            print("✅ Database connection successful")
        else:
            print("❌ Database query failed")
except Exception as e:
    print(f"❌ Database connection failed: {e}")
EOF

echo "Deployment check completed!" 