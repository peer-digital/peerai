#!/bin/bash
set -e

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
BACKEND_DIR="$APP_DIR/backend"
DB_NAME="peerai_db"
DB_USER="peerai"
DB_PASSWORD="peerai_password" # @note: Default database password

echo "Starting database initialization..."

# Ensure PostgreSQL is running
sudo systemctl status postgresql >/dev/null || sudo systemctl start postgresql

# Check if database exists
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "Database $DB_NAME already exists"
else
    echo "Creating database $DB_NAME..."
    sudo -u postgres createdb "$DB_NAME"
    echo "Database created successfully"
fi

# Check if database user exists
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")
if [ "$USER_EXISTS" = "1" ]; then
    echo "User $DB_USER already exists"
else
    echo "Creating database user $DB_USER..."
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
    echo "User created successfully"
fi

# Grant privileges to user
echo "Granting privileges to $DB_USER..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "Backend directory does not exist. Creating it..."
    mkdir -p "$BACKEND_DIR"
fi

# Navigate to backend directory
cd "$BACKEND_DIR"

# Check if virtual environment exists, create if it doesn't
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv || { echo "Failed to create virtual environment. Continuing without it."; exit 0; }
    
    # Only try to activate if the virtual environment was created
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
        pip install --upgrade pip
        
        # Check if requirements.txt exists
        if [ -f "requirements.txt" ]; then
            echo "Installing dependencies from requirements.txt..."
            pip install -r requirements.txt
        else
            echo "Warning: requirements.txt not found. Skipping dependency installation."
        fi
    else
        echo "Virtual environment activation file not found. Skipping dependency installation."
    fi
else
    # Only try to activate if the activation file exists
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    else
        echo "Virtual environment activation file not found. Skipping activation."
    fi
fi

# Only run migrations if we have an active virtual environment
if [ -f "venv/bin/activate" ] && [ -f "venv/bin/pip" ]; then
    # Check if alembic is installed and migrations directory exists before running migrations
    if venv/bin/pip list | grep -q alembic && [ -d "migrations" ]; then
        echo "Running database migrations..."
        venv/bin/python -m alembic upgrade head
    else
        echo "Skipping migrations: alembic not installed or migrations directory not found."
    fi
else
    echo "Skipping migrations: virtual environment not properly set up."
fi

# Only create admin user if we have an active virtual environment
if [ -f "venv/bin/python" ] && [ -f "$BACKEND_DIR/scripts/create_admin.py" ]; then
    echo "Creating admin user if needed..."
    venv/bin/python "$BACKEND_DIR/scripts/create_admin.py"
else
    echo "Skipping admin user creation: virtual environment not properly set up or script not found."
fi

echo "Database initialization completed successfully!" 