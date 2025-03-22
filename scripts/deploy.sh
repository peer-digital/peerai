#!/bin/bash
set -e

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
BACKEND_DIR="$APP_DIR/backend"
SYSTEMD_SERVICE="/etc/systemd/system/peerai.service"
DB_NAME="peerai_db"
DB_USER="peerai"
DB_PASSWORD="peerai_password"
SERVER_IP="158.174.210.91"

echo "Starting deployment process..."

# Create logs directory
mkdir -p "$APP_DIR/logs"

# Update environment variables
echo "Updating environment variables..."
cat > "$BACKEND_DIR/.env" << EOL
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
SECRET_KEY=your-secret-key-here
LOG_LEVEL=INFO
DEBUG=False
ALLOWED_ORIGINS=http://$SERVER_IP,https://$SERVER_IP
EOL

# Deploy backend
echo "Deploying backend..."
cd "$BACKEND_DIR"

# Create and activate virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt

# Initialize Alembic if needed
if [ ! -d "alembic" ]; then
    echo "Initializing Alembic migrations..."
    alembic init alembic
    # Update alembic.ini with correct database URL
    sed -i "s|sqlalchemy.url = driver://user:pass@localhost/dbname|sqlalchemy.url = postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME|" alembic.ini
    # Update env.py to import models
    echo "from backend.models import *" >> alembic/env.py
fi

# Run database migrations
echo "Running database migrations..."
python -m alembic upgrade head

# Move pre-built frontend to backend static directory
echo "Setting up pre-built frontend..."
mkdir -p "$BACKEND_DIR/static/admin-dashboard"
cp -r "$APP_DIR/dist/"* "$BACKEND_DIR/static/admin-dashboard/"

# Create systemd service file
echo "Creating systemd service file..."
sudo tee "$SYSTEMD_SERVICE" > /dev/null << EOL
[Unit]
Description=PeerAI API Service
After=network.target postgresql.service

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=$BACKEND_DIR
Environment=PYTHONPATH=$APP_DIR
EnvironmentFile=$BACKEND_DIR/.env
ExecStart=$BACKEND_DIR/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4 --log-level info
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOL

# Create nginx configuration
echo "Creating nginx configuration..."
sudo tee "/etc/nginx/sites-available/peerai" > /dev/null << EOL
server {
    listen 80;
    server_name $SERVER_IP;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /health {
        proxy_pass http://localhost:8000/health;
        access_log off;
        add_header Content-Type application/json;
    }
}
EOL

# Enable nginx site if not already enabled
if [ ! -f "/etc/nginx/sites-enabled/peerai" ]; then
    sudo ln -s "/etc/nginx/sites-available/peerai" "/etc/nginx/sites-enabled/peerai"
fi

# Restart services
echo "Restarting services..."
sudo systemctl daemon-reload
sudo systemctl enable peerai.service
sudo systemctl restart peerai.service
sudo nginx -t && sudo systemctl reload nginx

echo "Deployment completed successfully!"
echo "Application available at: http://$SERVER_IP"
echo "API available at: http://$SERVER_IP/api/v1" 