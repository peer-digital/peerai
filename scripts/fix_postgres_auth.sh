#!/bin/bash
set -e

# Define variables
VM_IP="158.174.210.91"
VM_USER="ubuntu"
DB_NAME="peerai_db"
DB_USER="peerai"
DB_PASSWORD="peerai_password"
SSH_KEY_FILE="$HOME/.ssh/peerai_vm_key"

# Check if SSH key exists, if not, set it up
if [ ! -f "$SSH_KEY_FILE" ]; then
    echo "SSH key not found. Setting up SSH key..."
    ./scripts/setup_ssh_key.sh
fi

echo "Fixing PostgreSQL authentication on VM at $VM_IP..."

# SSH into the VM and run commands to fix PostgreSQL authentication
ssh -i "$SSH_KEY_FILE" $VM_USER@$VM_IP << 'EOF'
echo "=== Creating/Updating PostgreSQL User ==="
sudo -u postgres psql -c "DROP USER IF EXISTS peerai;"
sudo -u postgres psql -c "CREATE USER peerai WITH PASSWORD 'peerai_password';"
sudo -u postgres psql -c "ALTER USER peerai WITH SUPERUSER;"

echo -e "\n=== Ensuring Database Exists ==="
sudo -u postgres psql -c "DROP DATABASE IF EXISTS peerai_db;"
sudo -u postgres psql -c "CREATE DATABASE peerai_db OWNER peerai;"

echo -e "\n=== Setting Permissions ==="
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE peerai_db TO peerai;"
sudo -u postgres psql -d peerai_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO peerai;"
sudo -u postgres psql -d peerai_db -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO peerai;"
sudo -u postgres psql -d peerai_db -c "GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO peerai;"

echo -e "\n=== Updating pg_hba.conf for MD5 Authentication ==="
# Find the PostgreSQL version and configuration directory
PG_VERSION=$(psql --version | grep -oE '[0-9]{1,2}' | head -1)
PG_HBA_PATH="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

# Backup the original file
sudo cp "$PG_HBA_PATH" "${PG_HBA_PATH}.bak"

# Update the authentication method for local connections to md5
sudo sed -i 's/local\s\+all\s\+all\s\+peer/local all all md5/g' "$PG_HBA_PATH"
sudo sed -i 's/host\s\+all\s\+all\s\+127.0.0.1\/32\s\+peer/host all all 127.0.0.1\/32 md5/g' "$PG_HBA_PATH"
sudo sed -i 's/host\s\+all\s\+all\s\+::1\/128\s\+peer/host all all ::1\/128 md5/g' "$PG_HBA_PATH"

echo -e "\n=== Restarting PostgreSQL ==="
sudo systemctl restart postgresql

echo -e "\n=== Testing Connection ==="
sleep 5  # Give PostgreSQL time to restart
PGPASSWORD='peerai_password' psql -U peerai -d peerai_db -h localhost -c "SELECT current_user, current_database();" || echo "Connection failed as peerai user"

echo -e "\n=== Done ==="
EOF 