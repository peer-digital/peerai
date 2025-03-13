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

echo "Diagnosing PostgreSQL on VM at $VM_IP..."

# SSH into the VM and run diagnostic commands
ssh -i "$SSH_KEY_FILE" $VM_USER@$VM_IP << 'EOF'
echo "=== PostgreSQL Service Status ==="
sudo systemctl status postgresql | head -n 20

echo -e "\n=== PostgreSQL Version ==="
psql --version

echo -e "\n=== PostgreSQL Authentication Configuration ==="
sudo grep -v "^#" /etc/postgresql/*/main/pg_hba.conf | grep -v "^$"

echo -e "\n=== PostgreSQL User List ==="
sudo -u postgres psql -c "\du"

echo -e "\n=== PostgreSQL Database List ==="
sudo -u postgres psql -c "\l"

echo -e "\n=== Testing peerai user connection ==="
PGPASSWORD='peerai_password' psql -U peerai -d peerai_db -h localhost -c "SELECT current_user, current_database();" || echo "Connection failed as peerai user"

echo -e "\n=== Testing postgres user connection ==="
sudo -u postgres psql -d peerai_db -c "SELECT current_user, current_database();" || echo "Connection failed as postgres user"

echo -e "\n=== Checking for alembic_version table ==="
sudo -u postgres psql -d peerai_db -c "SELECT * FROM pg_tables WHERE tablename = 'alembic_version';"

echo -e "\n=== Checking PostgreSQL logs ==="
sudo tail -n 50 /var/log/postgresql/postgresql-*.log
EOF 