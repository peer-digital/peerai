#!/bin/bash
set -e

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"  # Add this missing variable
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
# Database configuration
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

# Security
SECRET_KEY=${SECRET_KEY}
JWT_SECRET_KEY=${JWT_SECRET_KEY}
JWT_ALGORITHM=${JWT_ALGORITHM}
ACCESS_TOKEN_EXPIRE_MINUTES=${ACCESS_TOKEN_EXPIRE_MINUTES}

# API Configuration
API_V1_STR=${API_V1_STR}
PROJECT_NAME=${PROJECT_NAME}

# CORS
BACKEND_CORS_ORIGINS=${BACKEND_CORS_ORIGINS}
ALLOWED_ORIGINS=http://$SERVER_IP,https://$SERVER_IP

# Logging
LOG_LEVEL=INFO
DEBUG=False

# Email Configuration
SMTP_TLS=${SMTP_TLS}
SMTP_PORT=${SMTP_PORT}
SMTP_HOST=${SMTP_HOST}
SMTP_USER=${SMTP_USER}
SMTP_PASSWORD=${SMTP_PASSWORD}
EMAILS_FROM_EMAIL=${EMAILS_FROM_EMAIL}
EMAILS_FROM_NAME=${EMAILS_FROM_NAME}

# OpenAI Configuration
OPENAI_API_KEY=${OPENAI_API_KEY}
OPENAI_MODEL=${OPENAI_MODEL}

# Stripe Configuration
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
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

# Create models directory structure if needed
echo "Setting up models directory..."
mkdir -p "$BACKEND_DIR/backend/models"
touch "$BACKEND_DIR/backend/models/__init__.py"

# Create base.py with SQLAlchemy Base class
echo "Creating base.py..."
cat > "$BACKEND_DIR/backend/models/base.py" << 'EOF'
from sqlalchemy.ext.declarative import declarative_base
Base = declarative_base()
EOF

# Copy config.py to correct location if needed
if [ -f "$BACKEND_DIR/config.py" ] && [ ! -f "$BACKEND_DIR/backend/config.py" ]; then
    echo "Moving config.py to correct location..."
    cp "$BACKEND_DIR/config.py" "$BACKEND_DIR/backend/config.py"
fi

# Check if database tables exist
echo "Checking database tables..."
if ! PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "\dt" | grep -q "model_providers"; then
    echo "Database tables not found. Initializing tables..."
    cd "$APP_DIR"
    PYTHONPATH="$APP_DIR" python3 "$BACKEND_DIR/create_model_tables.py"
else
    echo "Database tables already exist. Skipping initialization."
fi

# Set up frontend
echo "Setting up frontend..."
FRONTEND_STATIC_DIR="$BACKEND_DIR/static/admin-dashboard"
mkdir -p "$FRONTEND_STATIC_DIR"
sudo chown -R ubuntu:ubuntu "$FRONTEND_STATIC_DIR"  # Ensure proper ownership

# Debug output
echo "Current directory: $(pwd)"
echo "APP_DIR: $APP_DIR"
echo "FRONTEND_DIR: $FRONTEND_DIR"  # Log this for debugging
echo "FRONTEND_STATIC_DIR: $FRONTEND_STATIC_DIR"

# Create a placeholder HTML file if no frontend files exist
if [ ! -d "/home/ubuntu/frontend/admin-dashboard/dist" ] || [ -z "$(ls -A /home/ubuntu/frontend/admin-dashboard/dist 2>/dev/null)" ]; then
    echo "Frontend files not found. Creating placeholder..."
    echo "<html><body><h1>PeerAI Frontend</h1><p>This is a placeholder. The frontend files were not found during deployment.</p></body></html>" > "$FRONTEND_STATIC_DIR/index.html"
    echo "Created placeholder frontend file in $FRONTEND_STATIC_DIR"
else
    echo "Copying frontend files to static directory..."
    cp -r "/home/ubuntu/frontend/admin-dashboard/dist/"* "$FRONTEND_STATIC_DIR/"
    echo "Frontend files copied successfully"
fi

# Set permissions for the static directory
echo "Setting permissions for static directory..."
chmod -R 755 "$FRONTEND_STATIC_DIR"
chown -R ubuntu:ubuntu "$FRONTEND_STATIC_DIR"
echo "Frontend setup completed successfully"

# Configure frontend (for legacy scripts)
echo "Configuring frontend..."
if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR"
    
    # Create dist directory if it doesn't exist
    if [ ! -d "$FRONTEND_DIR/dist" ]; then
        echo "Creating frontend dist directory..."
        mkdir -p "$FRONTEND_DIR/dist"
        
        # If we have files in the static directory, copy them to dist as well
        if [ -d "$FRONTEND_STATIC_DIR" ] && [ "$(ls -A "$FRONTEND_STATIC_DIR")" ]; then
            echo "Copying files from static directory to frontend/dist..."
            cp -r "$FRONTEND_STATIC_DIR/"* "$FRONTEND_DIR/dist/"
        else
            # Create a simple placeholder
            echo "Creating placeholder index.html..."
            echo "<html><body><h1>PeerAI Frontend</h1><p>Placeholder page. Please build the frontend.</p></body></html>" > "$FRONTEND_DIR/dist/index.html"
        fi
    fi
    
    # Set proper permissions for frontend files
    echo "Setting proper permissions for frontend files..."
    chmod -R 755 "$FRONTEND_DIR/dist"
    find "$FRONTEND_DIR/dist" -type f -exec chmod 644 {} \; 2>/dev/null || true
    find "$FRONTEND_DIR/dist" -type d -exec chmod 755 {} \; 2>/dev/null || true
    chown -R ubuntu:ubuntu "$FRONTEND_DIR/dist"
else
    echo "Warning: Frontend directory not found at $FRONTEND_DIR"
    echo "Creating frontend directory structure..."
    mkdir -p "$FRONTEND_DIR/dist"
    echo "<html><body><h1>PeerAI Frontend</h1><p>Placeholder page. Frontend directory was created by deploy script.</p></body></html>" > "$FRONTEND_DIR/dist/index.html"
    chmod -R 755 "$FRONTEND_DIR/dist"
    chown -R ubuntu:ubuntu "$FRONTEND_DIR/dist"
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
ExecStart=$BACKEND_DIR/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 --log-level info
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
    
    root /var/www/peerai;
    index index.html;
    
    # Handle client-side routing
    location /app/ {
        alias /var/www/peerai/;
    }
    
    location / {
        try_files \$uri \$uri/ /index.html =404;
    }
    
    # API endpoints
    location /api/v1/ {
        proxy_pass http://localhost:8000/api/v1/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    
    location = /health {
        proxy_pass http://localhost:8000/health;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
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