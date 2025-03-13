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

echo "Connecting to PostgreSQL on VM at $VM_IP..."

# SSH into the VM and connect to PostgreSQL
ssh -i "$SSH_KEY_FILE" $VM_USER@$VM_IP "PGPASSWORD='$DB_PASSWORD' psql -U $DB_USER -d $DB_NAME -h localhost"

# If the above command fails, try with postgres user
if [ $? -ne 0 ]; then
    echo "Failed to connect as $DB_USER, trying with postgres user..."
    ssh -i "$SSH_KEY_FILE" $VM_USER@$VM_IP "sudo -u postgres psql -d $DB_NAME"
fi 