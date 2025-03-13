#!/bin/bash
set -e

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
FRONTEND_DIR="$APP_DIR/frontend/admin-dashboard"
BACKEND_DIR="$APP_DIR/backend"
NGINX_CONF="/etc/nginx/sites-available/peerai"
NGINX_ENABLED="/etc/nginx/sites-enabled/peerai"
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

# Create frontend environment file
echo "Creating frontend environment file..."
cat > "$FRONTEND_DIR/.env" << EOL
VITE_API_URL=http://$SERVER_IP/api/v1
VITE_APP_ENV=production
EOL

# Deploy backend
echo "Deploying backend..."
cd "$BACKEND_DIR"

# Create Python virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
source venv/bin/activate
pip install -r requirements.txt

# Restore database from backup if it exists
if [ -f "$APP_DIR/server_dump.backup" ]; then
    echo "Restoring database from backup..."
    # Make the restore script executable
    chmod +x "$APP_DIR/scripts/restore_db.sh"
    # Run the restore script
    "$APP_DIR/scripts/restore_db.sh"
else
    echo "No backup file found, running migrations instead..."
    # Run database migrations
    python -m alembic upgrade head
fi

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

# Reload systemd, enable and restart service
sudo systemctl daemon-reload
sudo systemctl enable peerai.service
sudo systemctl restart peerai.service

# Deploy frontend
echo "Deploying frontend..."
cd "$FRONTEND_DIR"

# Install dependencies and build
npm ci
npm run build

# Create nginx configuration
echo "Creating nginx configuration..."
sudo tee "$NGINX_CONF" > /dev/null << EOL
server {
    listen 80;
    server_name $SERVER_IP;

    # Frontend
    location / {
        root $FRONTEND_DIR/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
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

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8000/health;
        access_log off;
        add_header Content-Type application/json;
    }
}
EOL

# Enable nginx site if not already enabled
if [ ! -f "$NGINX_ENABLED" ]; then
    sudo ln -s "$NGINX_CONF" "$NGINX_ENABLED"
fi

# Test nginx configuration and reload
sudo nginx -t
sudo systemctl reload nginx

# Set up cron jobs
echo "Setting up cron jobs..."
chmod +x "$APP_DIR/scripts/setup_cron.sh"
"$APP_DIR/scripts/setup_cron.sh"

echo "Deployment completed successfully!"
echo "Frontend available at: http://$SERVER_IP"
echo "Backend API available at: http://$SERVER_IP/api" 