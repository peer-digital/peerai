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

# Activate virtual environment and install dependencies
echo "Installing backend dependencies..."
source venv/bin/activate
pip install --upgrade pip

# Check if requirements.txt exists, create a basic one if it doesn't
if [ ! -f "requirements.txt" ]; then
    echo "requirements.txt not found, creating a basic one..."
    cat > "requirements.txt" << EOL
fastapi==0.110.0
uvicorn==0.27.1
sqlalchemy==2.0.27
alembic==1.13.1
psycopg2-binary==2.9.9
python-dotenv==1.0.0
pydantic==2.6.1
pydantic-settings==2.1.0
EOL
fi

# Install dependencies
pip install -r requirements.txt

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

# Deploy frontend (frontend is pre-built and extracted by GitHub Actions)
echo "Configuring frontend..."
cd "$FRONTEND_DIR"

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

# Set proper permissions
echo "Setting proper permissions..."
sudo chown -R ubuntu:ubuntu "$APP_DIR"

# Reload systemd, enable and restart service
echo "Restarting services..."
sudo systemctl daemon-reload
sudo systemctl enable peerai.service
sudo systemctl restart peerai.service

# Test nginx configuration and reload
sudo nginx -t
sudo systemctl reload nginx

# Create admin user if it doesn't exist
echo "Creating admin user if needed..."
if [ ! -d "$BACKEND_DIR/scripts" ]; then
    mkdir -p "$BACKEND_DIR/scripts"
fi

if [ ! -f "$BACKEND_DIR/scripts/create_admin.py" ]; then
    echo "Creating admin user script..."
    cat > "$BACKEND_DIR/scripts/create_admin.py" << EOL
import os
import sys
import hashlib
import datetime
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("Error: DATABASE_URL environment variable not set")
    sys.exit(1)

# Create SQLAlchemy engine and session
engine = create_engine(database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Define Base model
Base = declarative_base()

# Define User model
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

# Simple password hashing function (in production, use a proper hashing library)
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def create_admin_user():
    db = SessionLocal()
    
    # Check if admin user already exists
    admin = db.query(User).filter(User.is_admin == True).first()
    if admin:
        print(f"Admin user already exists: {admin.email}")
        return
    
    # Create admin user
    admin_email = "admin@peerai.com"
    admin_password = "admin123"  # Change this in production
    
    admin_user = User(
        email=admin_email,
        hashed_password=hash_password(admin_password),
        is_active=True,
        is_admin=True
    )
    
    db.add(admin_user)
    db.commit()
    print(f"Admin user created: {admin_email}")
    print("IMPORTANT: Change the default admin password after first login!")

if __name__ == "__main__":
    create_admin_user()
EOL
fi

# Run the admin user creation script
cd "$BACKEND_DIR"
source venv/bin/activate
python scripts/create_admin.py

echo "Deployment completed successfully!"
echo "Frontend available at: http://$SERVER_IP"
echo "Backend API available at: http://$SERVER_IP/api" 