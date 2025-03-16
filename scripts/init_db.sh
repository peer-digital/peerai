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
    python3 -m venv venv
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
    # Activate virtual environment
    source venv/bin/activate
fi

# Check if alembic is installed and migrations directory exists before running migrations
if pip list | grep -q alembic && [ -d "migrations" ]; then
    echo "Running database migrations..."
    python -m alembic upgrade head
else
    echo "Skipping migrations: alembic not installed or migrations directory not found."
fi

# Create admin user if it doesn't exist
echo "Creating admin user if needed..."
if [ -f "$BACKEND_DIR/scripts/create_admin.py" ]; then
    python "$BACKEND_DIR/scripts/create_admin.py"
else
    echo "Warning: create_admin.py script not found. Skipping admin user creation."
fi

echo "Database initialization completed successfully!" 