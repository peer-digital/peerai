#!/bin/bash
set -e

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
FRONTEND_DIR="$APP_DIR/frontend"
BACKEND_DIR="$APP_DIR/backend"
NGINX_CONF="/etc/nginx/sites-available/peerai"
NGINX_ENABLED="/etc/nginx/sites-enabled/peerai"
SYSTEMD_SERVICE="/etc/systemd/system/peerai.service"
DB_NAME="peerai_db"
DB_USER="peerai"
DB_PASSWORD="peerai_password"
SERVER_IP="158.174.210.91" # @note: Production server IP address
ENVIRONMENT="production" # @note: Set to "development" for development environment

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

# Create basic application structure if it doesn't exist
if [ ! -d "backend" ]; then
    echo "Creating basic application structure..."
    mkdir -p backend
    
    # Create __init__.py
    touch backend/__init__.py
    
    # Create main.py with a basic FastAPI application
    cat > backend/main.py << EOL
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(title="PeerAI API", version="0.1.0")

# Configure CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    return {"status": "healthy"}

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to PeerAI API"}

# API v1 endpoint
@app.get("/api/v1")
def api_v1():
    return {"message": "PeerAI API v1"}
EOL
fi

# Create Python virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Ensure venv/bin/activate exists before trying to source it
if [ -f "venv/bin/activate" ]; then
    echo "Installing backend dependencies..."
    source venv/bin/activate
    pip install --upgrade pip

    # Install dependencies from the existing requirements.txt
    pip install -r requirements.txt
else
    echo "ERROR: Failed to create virtual environment. Check Python installation."
    exit 1
fi

# Check if alembic directory exists, initialize if it doesn't
if [ ! -d "migrations" ]; then
    echo "Alembic migrations directory not found, initializing..."
    mkdir -p migrations
    
    # Create a basic alembic.ini file
    cat > "alembic.ini" << EOL
[alembic]
script_location = migrations
prepend_sys_path = .
sqlalchemy.url = postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
EOL

    # Create migrations directory structure
    mkdir -p migrations/versions
    
    # Create env.py
    cat > "migrations/env.py" << EOL
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = None

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
EOL

    # Create script.py.mako
    cat > "migrations/script.py.mako" << 'EOL'
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}

def upgrade() -> None:
    ${upgrades if upgrades else "pass"}

def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
EOL

    # Create an initial migration
    cat > "migrations/versions/initial_migration.py" << EOL
"""Initial migration

Revision ID: initial_migration
Revises: 
Create Date: 2025-03-16

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'initial_migration'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_admin', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )


def downgrade() -> None:
    op.drop_table('users')
EOL
fi

# Run database migrations
echo "Running database migrations..."
python -m alembic upgrade head

# Create systemd service file
echo "Creating systemd service file..."
sudo tee "$SYSTEMD_SERVICE" > /dev/null << EOL
[Unit]
Description=PeerAI API Service
After=network.target postgresql.service
Wants=postgresql.service

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=$BACKEND_DIR
Environment=PYTHONPATH=$APP_DIR
EnvironmentFile=$BACKEND_DIR/.env
ExecStart=$BACKEND_DIR/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4 --log-level info
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=peerai

[Install]
WantedBy=multi-user.target
EOL

# Deploy frontend (frontend is pre-built and extracted by GitHub Actions)
echo "Configuring frontend..."
cd "$FRONTEND_DIR"

# Set proper permissions for frontend files
echo "Setting proper permissions for frontend files..."
sudo chown -R ubuntu:ubuntu "$FRONTEND_DIR"
sudo chmod -R 755 "$FRONTEND_DIR"
sudo chmod -R +r "$FRONTEND_DIR/dist"

# Make sure Nginx user can access the frontend directory
sudo usermod -a -G ubuntu www-data
sudo chmod g+rx /home/ubuntu
sudo chmod g+rx "$APP_DIR"
sudo chmod g+rx "$FRONTEND_DIR"

# First check if a newer NGINX configuration exists from the deployment
if [ -f "/home/ubuntu/deployment/nginx.conf.latest" ]; then
  echo "Found newer NGINX configuration at /home/ubuntu/deployment/nginx.conf.latest"
  echo "Copying it to $NGINX_CONF..."
  sudo cp "/home/ubuntu/deployment/nginx.conf.latest" "$NGINX_CONF"
# Create nginx configuration if it doesn't exist yet
elif [ ! -f "$NGINX_CONF" ]; then
  echo "Creating nginx configuration..."
  sudo tee "$NGINX_CONF" > /dev/null << EOL
  server {
      listen 80;
      server_name $SERVER_IP;  # Use the server IP variable
  
      root $FRONTEND_DIR/dist; # Path to built frontend
      index index.html;
  
      # @important: Main frontend route
      location / {
          try_files \$uri \$uri/ /index.html;
      }
  
      # @important: API proxy with consistent URL pattern for all deployment scenarios
      location /api {
          # Remove trailing slashes for consistent URL handling
          rewrite ^/(.*)/$ /\$1 permanent;
          
          # Proxy to backend FastAPI service, no trailing slash to avoid path issues
          proxy_pass http://localhost:8000/api;
          
          proxy_http_version 1.1;
          proxy_set_header Upgrade \$http_upgrade;          # For websockets
          proxy_set_header Connection "upgrade";          # For websockets
          proxy_set_header Host \$host;
          proxy_cache_bypass \$http_upgrade;
          proxy_set_header X-Real-IP \$remote_addr;
          proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto \$scheme;
          proxy_set_header X-Forwarded-Host \$host;
          
          # Increase timeouts for streaming responses
          proxy_connect_timeout 300s;
          proxy_send_timeout 300s;
          proxy_read_timeout 300s;
          
          # Add CORS headers for development
          if (\$request_method = 'OPTIONS') {
              add_header 'Access-Control-Allow-Origin' '*';
              add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
              add_header 'Access-Control-Allow-Headers' 'X-API-Key, Authorization, Content-Type, Accept';
              add_header 'Access-Control-Max-Age' 86400;
              add_header 'Content-Type' 'text/plain charset=UTF-8';
              add_header 'Content-Length' 0;
              return 204;
          }
          
          # Add CORS headers for actual requests
          add_header 'Access-Control-Allow-Origin' '*';
          add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
          add_header 'Access-Control-Allow-Headers' 'X-API-Key, Authorization, Content-Type, Accept, Origin, X-Requested-With';
      }
  
      # Health check endpoint
      location /health {
          proxy_pass http://localhost:8000/health;
          proxy_http_version 1.1;
          proxy_set_header Host \$host;
          proxy_set_header X-Real-IP \$remote_addr;
          access_log off;
      }
  
      # Cache static assets
      location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
          expires 30d;
          add_header Cache-Control "public, no-transform";
      }
  
      # Deny access to .htaccess files
      location ~ /\.ht {
          deny all;
      }
  
      # Client-side routing - all routes that don't match other locations should serve index.html
      location @rewrites {
          rewrite ^(.+)$ /index.html last;
      }
      
      # Special location for auth endpoints to ensure they work without issues
      location /api/auth {
          proxy_pass http://localhost:8000/api/auth;
          proxy_http_version 1.1;
          proxy_set_header Host \$host;
          proxy_set_header X-Real-IP \$remote_addr;
          proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto \$scheme;
          proxy_connect_timeout 300s;
          proxy_send_timeout 300s;
          proxy_read_timeout 300s;
          
          # Enable debug logging for auth endpoints
          error_log /var/log/nginx/auth_error.log debug;
          access_log /var/log/nginx/auth_access.log;
      }
      
      # Log configuration
      access_log /var/log/nginx/peerai_access.log;
      error_log /var/log/nginx/peerai_error.log;
  }
EOL
else
  echo "NGINX configuration already exists at $NGINX_CONF, skipping creation..."
  echo "To update NGINX configuration, use the deployment/nginx.conf file and deployment workflow."
fi

# Enable nginx site if not already enabled
if [ ! -f "$NGINX_ENABLED" ]; then
    sudo ln -s "$NGINX_CONF" "$NGINX_ENABLED"
fi

# Disable default Nginx site if it exists
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    echo "Disabling default Nginx site..."
    sudo rm -f /etc/nginx/sites-enabled/default
fi

# Set proper permissions
echo "Setting proper permissions..."
sudo chown -R ubuntu:ubuntu "$APP_DIR"

# Reload systemd, enable and restart service
echo "Restarting services..."
sudo systemctl daemon-reload
sudo systemctl enable peerai.service
sudo systemctl restart peerai.service

# Test nginx configuration and reload
echo "Testing Nginx configuration..."
if ! sudo nginx -t; then
    echo "Nginx configuration test failed. Checking for conflicting configurations..."
    echo "List of enabled sites:"
    ls -la /etc/nginx/sites-enabled/
    echo "Attempting to fix configuration..."
    # Keep only our configuration
    sudo rm -f /etc/nginx/sites-enabled/*
    sudo ln -s "$NGINX_CONF" "$NGINX_ENABLED"
    # Test again
    sudo nginx -t
fi

sudo systemctl reload nginx

# Check Nginx error logs
echo "Checking Nginx error logs..."
sudo tail -n 20 /var/log/nginx/error.log

# Configure firewall to allow HTTP/HTTPS traffic
echo "Configuring firewall..."
sudo ufw status | grep -q "Status: active" && {
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    echo "Firewall configured to allow HTTP/HTTPS traffic"
} || echo "Firewall is not active, skipping configuration"

# Create admin user if it doesn't exist
echo "Creating admin user if needed..."
cd "$BACKEND_DIR"
source venv/bin/activate

# Create scripts directory if it doesn't exist
if [ ! -d "scripts" ]; then
    echo "Creating scripts directory..."
    mkdir -p scripts
fi

# Check if admin user creation script exists, copy from source if available
if [ ! -f "scripts/create_admin.py" ] && [ -f "/home/ubuntu/scripts/create_admin.py" ]; then
    echo "Copying admin user creation script from source..."
    cp /home/ubuntu/scripts/create_admin.py scripts/
fi

# Run the admin user creation script if it exists
if [ -f "scripts/create_admin.py" ]; then
    echo "Running existing admin user creation script..."
    python scripts/create_admin.py
else
    echo "Admin user creation script not found, skipping..."
fi

# Run test users creation script if it exists and we're in development mode
if [ -f "scripts/create_test_users.py" ] && [ "$ENVIRONMENT" = "development" ]; then
    echo "Creating test users for development environment..."
    python scripts/create_test_users.py
fi

echo "Deployment completed successfully!"
echo "Frontend available at: http://$SERVER_IP"
echo "Backend API available at: http://$SERVER_IP/api" 