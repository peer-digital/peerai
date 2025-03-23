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

# Check if we should skip Nginx configuration
SKIP_NGINX_CONFIG=${SKIP_NGINX_CONFIG:-false}
echo "SKIP_NGINX_CONFIG flag is set to: ${SKIP_NGINX_CONFIG}"

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
VITE_API_BASE_URL=http://$SERVER_IP
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
from fastapi import FastAPI, Depends, HTTPException, status, APIRouter, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from datetime import datetime, timedelta
from passlib.context import CryptContext

# Load environment variables
load_dotenv()

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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

# Authentication models
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

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

# Authentication endpoints
@app.post("/auth/login")
def login(login_data: LoginRequest):
    # Check for super admin credentials
    if login_data.email == "super.admin@peerai.se" and login_data.password == "superadmin123":
        return LoginResponse(
            access_token="mock_token_for_testing_purposes_only",
            token_type="bearer",
            user={
                "id": 1,
                "email": login_data.email,
                "name": "Super Admin",
                "role": "super_admin"
            }
        )
    # Check for admin credentials
    elif login_data.email == "admin@peerai.se" and login_data.password == "admin123":
        return LoginResponse(
            access_token="mock_token_for_testing_purposes_only",
            token_type="bearer",
            user={
                "id": 2,
                "email": login_data.email,
                "name": "Team Admin",
                "role": "user_admin"
            }
        )
    # Check for regular user credentials
    elif login_data.email == "user@peerai.se" and login_data.password == "user123":
        return LoginResponse(
            access_token="mock_token_for_testing_purposes_only",
            token_type="bearer",
            user={
                "id": 3,
                "email": login_data.email,
                "name": "Regular User",
                "role": "user"
            }
        )
    # Fallback for demo purposes
    elif login_data.email == "admin@example.com" and login_data.password == "password":
        return LoginResponse(
            access_token="mock_token_for_testing_purposes_only",
            token_type="bearer",
            user={
                "id": 4,
                "email": login_data.email,
                "name": "Admin User",
                "role": "admin"
            }
        )
    
    # If no credentials match
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

@app.get("/auth/me")
def get_current_user():
    # This is a mock implementation - in production, validate token and return user
    return {
        "id": 1,
        "email": "super.admin@peerai.se",
        "name": "Super Admin",
        "role": "super_admin"
    }

# Create API v1 router for versioned endpoints
api_v1_router = APIRouter(prefix="/api/v1")

# Add API v1 auth endpoints
@api_v1_router.post("/auth/login")
def api_v1_login(login_data: LoginRequest):
    # Reuse the same login logic
    return login(login_data)

@api_v1_router.get("/auth/me")
def api_v1_get_current_user():
    # Reuse the same get_current_user logic
    return get_current_user()

# Include the API v1 router
app.include_router(api_v1_router)

# Form-compatible login endpoint for legacy clients
@app.post("/api/v1/auth/login-form")
async def api_v1_login_form(username: str = Form(...), password: str = Form(...)):
    """Login endpoint that accepts form data for backward compatibility"""
    try:
        # Convert form data to the expected LoginRequest format
        login_data = LoginRequest(email=username, password=password)
        return login(login_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid login payload: {str(e)}"
        )
EOL
else
    # Check and update existing backend code
    echo "Checking and updating existing backend code..."
    
    # Ensure backend main.py has the auth endpoint
    echo "Checking backend main.py for auth endpoint..."
    if ! grep -q "@app.post(\"/auth/login\")" "$BACKEND_DIR/backend/main.py"; then
        echo "Auth endpoint not found in main.py. Updating..."
        # Create a backup of the original file
        cp "$BACKEND_DIR/backend/main.py" "$BACKEND_DIR/backend/main.py.bak"
        
        # Update the file to ensure auth endpoint is properly defined
        sed -i 's|@app.post("/auth/login")|@app.post("/auth/login")|g' "$BACKEND_DIR/backend/main.py"
    fi
    
    # Ensure API v1 endpoints are properly defined
    echo "Checking backend main.py for API v1 endpoints..."
    if ! grep -q "api_v1_router = APIRouter(prefix=\"/api/v1\")" "$BACKEND_DIR/backend/main.py"; then
        echo "API v1 endpoints not properly defined in main.py. Updating..."
        # Create a backup of the original file if not already done
        if [ ! -f "$BACKEND_DIR/backend/main.py.bak" ]; then
            cp "$BACKEND_DIR/backend/main.py" "$BACKEND_DIR/backend/main.py.bak"
        fi
        
        # Update the main.py file to include proper API v1 routing
        cat > "$BACKEND_DIR/backend/main.py" << EOL
from fastapi import FastAPI, Depends, HTTPException, status, APIRouter, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from datetime import datetime, timedelta
from passlib.context import CryptContext

# Load environment variables
load_dotenv()

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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

# Authentication models
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

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

# Authentication endpoints
@app.post("/auth/login")
def login(login_data: LoginRequest):
    # Check for super admin credentials
    if login_data.email == "super.admin@peerai.se" and login_data.password == "superadmin123":
        return LoginResponse(
            access_token="mock_token_for_testing_purposes_only",
            token_type="bearer",
            user={
                "id": 1,
                "email": login_data.email,
                "name": "Super Admin",
                "role": "super_admin"
            }
        )
    # Check for admin credentials
    elif login_data.email == "admin@peerai.se" and login_data.password == "admin123":
        return LoginResponse(
            access_token="mock_token_for_testing_purposes_only",
            token_type="bearer",
            user={
                "id": 2,
                "email": login_data.email,
                "name": "Team Admin",
                "role": "user_admin"
            }
        )
    # Check for regular user credentials
    elif login_data.email == "user@peerai.se" and login_data.password == "user123":
        return LoginResponse(
            access_token="mock_token_for_testing_purposes_only",
            token_type="bearer",
            user={
                "id": 3,
                "email": login_data.email,
                "name": "Regular User",
                "role": "user"
            }
        )
    # Fallback for demo purposes
    elif login_data.email == "admin@example.com" and login_data.password == "password":
        return LoginResponse(
            access_token="mock_token_for_testing_purposes_only",
            token_type="bearer",
            user={
                "id": 4,
                "email": login_data.email,
                "name": "Admin User",
                "role": "admin"
            }
        )
    
    # If no credentials match
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

@app.get("/auth/me")
def get_current_user():
    # This is a mock implementation - in production, validate token and return user
    return {
        "id": 1,
        "email": "super.admin@peerai.se",
        "name": "Super Admin",
        "role": "super_admin"
    }

# Create API v1 router for versioned endpoints
api_v1_router = APIRouter(prefix="/api/v1")

# Add API v1 auth endpoints
@api_v1_router.post("/auth/login")
def api_v1_login(login_data: LoginRequest):
    # Reuse the same login logic
    return login(login_data)

@api_v1_router.get("/auth/me")
def api_v1_get_current_user():
    # Reuse the same get_current_user logic
    return get_current_user()

# Include the API v1 router
app.include_router(api_v1_router)

# Form-compatible login endpoint for legacy clients
@app.post("/api/v1/auth/login-form")
async def api_v1_login_form(username: str = Form(...), password: str = Form(...)):
    """Login endpoint that accepts form data for backward compatibility"""
    try:
        # Convert form data to the expected LoginRequest format
        login_data = LoginRequest(email=username, password=password)
        return login(login_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid login payload: {str(e)}"
        )
EOL
    fi
fi

# Create Python virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
echo "Installing backend dependencies..."
source venv/bin/activate
pip install --upgrade pip

# Install dependencies from the existing requirements.txt
pip install -r requirements.txt

# Ensure passlib is installed for password hashing
pip install passlib[bcrypt]

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
    cat > "migrations/script.py.mako" << EOL
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
Environment=PYTHONPATH=$BACKEND_DIR
EnvironmentFile=$BACKEND_DIR/.env
ExecStart=$BACKEND_DIR/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 --log-level info
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=peerai

[Install]
WantedBy=multi-user.target
EOL

# Configure backend service
echo "Configuring backend service..."
sudo systemctl daemon-reload
sudo systemctl enable peerai.service
sudo systemctl restart peerai.service

# Deploy frontend (frontend is pre-built and extracted by GitHub Actions)
echo "Configuring frontend..."
cd "$FRONTEND_DIR"

# Set proper permissions for frontend files
echo "Setting proper permissions for frontend files..."
sudo chmod -R 755 "$FRONTEND_DIR/dist"
sudo find "$FRONTEND_DIR/dist" -type f -exec chmod 644 {} \;
sudo find "$FRONTEND_DIR/dist" -type d -exec chmod 755 {} \;
sudo chown -R www-data:www-data "$FRONTEND_DIR/dist"

# Only configure Nginx if we're not skipping it
if [ "$SKIP_NGINX_CONFIG" = "false" ]; then
    echo "Configuring Nginx (SKIP_NGINX_CONFIG is false)..."
    
    # Create nginx configuration
    echo "Creating nginx configuration..."
    sudo tee "$NGINX_CONF" > /dev/null << EOL
server {
    listen 80 default_server;
    server_name _;
    
    # Set proper root directory and index
    root $FRONTEND_DIR/dist;
    index index.html;
    
    # Frontend - Handle client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API v1 endpoints
    location ^~ /api/v1/ {
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Handle OPTIONS requests
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        
        proxy_pass http://localhost:8000/api/v1/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
        proxy_buffering off;
        proxy_http_version 1.1;
    }

    # Backend API endpoints (fallback for non-versioned endpoints)
    location /api/ {
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Handle OPTIONS requests
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        
        proxy_pass http://localhost:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
    }

    # Health check endpoint
    location /health {
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Handle OPTIONS requests
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        
        proxy_pass http://localhost:8000/health;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
    }

    # Log configuration
    access_log /var/log/nginx/peerai_access.log;
    error_log /var/log/nginx/peerai_error.log;
}
EOL

    # Enable nginx site if not already enabled
    if [ ! -f "$NGINX_ENABLED" ]; then
        sudo ln -s "$NGINX_CONF" "$NGINX_ENABLED"
    fi

    # Test nginx configuration and reload
    echo "Testing Nginx configuration..."
    if ! sudo nginx -t; then
        echo "Nginx configuration test failed. Using fix-nginx.sh instead..."
        if [ -f "/home/ubuntu/scripts/fix-nginx.sh" ]; then
            bash /home/ubuntu/scripts/fix-nginx.sh
        else
            echo "fix-nginx.sh not found. Nginx configuration may need manual fixing."
        fi
    else
        echo "Nginx configuration test passed. Restarting Nginx..."
        sudo systemctl restart nginx
    fi
else
    echo "Skipping Nginx configuration as SKIP_NGINX_CONFIG is set to true"
    echo "Please make sure to configure Nginx manually or run fix-nginx.sh separately"
fi

echo "Deployment completed successfully!"
echo "Frontend available at: http://$SERVER_IP"
echo "Backend API available at: http://$SERVER_IP/api"

# Check API endpoints
echo "Checking API endpoints..."
echo "Testing root endpoint:"

# Retry mechanism for backend checks
MAX_RETRIES=5
RETRY_COUNT=0
BACKEND_RUNNING=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:8000/ | grep -q "Welcome"; then
        echo "✅ Root endpoint is working"
        BACKEND_RUNNING=true
        break
    else
        echo "❌ Root endpoint is not working (attempt $((RETRY_COUNT+1))/$MAX_RETRIES)"
        RETRY_COUNT=$((RETRY_COUNT+1))
        
        if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
            echo "Response from root endpoint:"
            curl -v http://localhost:8000/
        else
            echo "Waiting 5 seconds before retrying..."
            sleep 5
        fi
    fi
done

if [ "$BACKEND_RUNNING" = false ]; then
    echo "WARNING: Backend service is not responding after multiple attempts."
    echo "Checking backend logs..."
    tail -n 50 "$APP_DIR/logs/backend.log"
    echo "Checking backend direct logs..."
    tail -n 50 "$APP_DIR/logs/backend_direct.log"
    echo "Checking systemd service status..."
    sudo systemctl status peerai.service
    
    echo "Attempting one final restart of the backend service..."
    cd "$BACKEND_DIR"
    source venv/bin/activate
    pkill -f uvicorn || echo "No uvicorn processes found"
    nohup python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --log-level debug > "$APP_DIR/logs/backend_final.log" 2>&1 &
    echo $! > "$APP_DIR/backend_final.pid"
    echo "Final backend restart as process $(cat "$APP_DIR/backend_final.pid")"
    sleep 10
fi

# Continue with other endpoint checks
echo "Testing health endpoint:"
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo "✅ Health endpoint is working"
else
    echo "❌ Health endpoint is not working"
    echo "Response from health endpoint:"
    curl -v http://localhost:8000/health
fi

echo "Testing API v1 endpoint:"
if curl -s http://localhost:8000/api/v1 | grep -q "PeerAI API v1"; then
    echo "✅ API v1 endpoint is working"
else
    echo "❌ API v1 endpoint is not working"
    echo "Response from API v1 endpoint:"
    curl -v http://localhost:8000/api/v1
fi

echo "Testing auth endpoints:"
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"email":"super.admin@peerai.se","password":"superadmin123"}' http://localhost:8000/auth/login)
echo "Auth login endpoint status: $AUTH_STATUS"
if [ "$AUTH_STATUS" = "200" ]; then
    echo "✅ Auth login endpoint is working"
    echo "Response from auth login endpoint:"
    curl -s -X POST -H "Content-Type: application/json" -d '{"email":"super.admin@peerai.se","password":"superadmin123"}' http://localhost:8000/auth/login | grep -q "access_token" && echo "Token received successfully"
else
    echo "❌ Auth login endpoint is not working"
fi

# Check Nginx proxy configuration
echo "Testing Nginx proxy configuration:"
echo "API via Nginx:"
curl -s http://$SERVER_IP/api/ | grep -q "Welcome" && echo "✅ API via Nginx is working" || echo "❌ API via Nginx is not working"

echo "API v1 via Nginx:"
curl -s http://$SERVER_IP/api/v1 | grep -q "PeerAI API v1" && echo "✅ API v1 via Nginx is working" || echo "❌ API v1 via Nginx is not working"

# Check if SKIP_NGINX_CONFIG is true before trying to install Lua modules
if [ "$SKIP_NGINX_CONFIG" = "false" ]; then
    # Install lua-nginx-module and dependencies if needed
    echo "Checking for Lua module for Nginx..."
    if ! dpkg -l | grep -q "libnginx-mod-http-lua"; then
        echo "Installing Lua module for Nginx..."
        sudo apt-get update
        sudo apt-get install -y libnginx-mod-http-lua
        
        # Install lua-cjson if needed
        if ! luarocks list | grep -q "lua-cjson"; then
            sudo apt-get install -y luarocks
            sudo luarocks install lua-cjson
        fi
        
        # Restart Nginx to load new modules
        sudo systemctl restart nginx
    fi
else
    echo "Skipping Lua module installation as SKIP_NGINX_CONFIG is set to true"
fi

# Run the Nginx fix script if available
if [ -f "/home/ubuntu/scripts/fix-nginx.sh" ]; then
    echo "Running the fix-nginx.sh script to ensure proper Nginx configuration..."
    bash /home/ubuntu/scripts/fix-nginx.sh
else
    echo "fix-nginx.sh not found. Please ensure Nginx is properly configured manually."
fi
