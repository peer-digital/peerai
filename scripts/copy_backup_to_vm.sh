#!/bin/bash
set -e

# Define variables
VM_IP="158.174.210.91"
VM_USER="ubuntu"
BACKUP_FILE="server_dump.backup"
REMOTE_DIR="/home/ubuntu/peer-ai"

echo "Copying backup file to VM..."

# Check if backup file exists locally
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found at $BACKUP_FILE"
    exit 1
fi

# Create the remote directory if it doesn't exist
ssh "$VM_USER@$VM_IP" "mkdir -p $REMOTE_DIR"

# Copy the backup file to the VM
echo "Copying $BACKUP_FILE to $VM_USER@$VM_IP:$REMOTE_DIR/"
scp "$BACKUP_FILE" "$VM_USER@$VM_IP:$REMOTE_DIR/"

# Set correct permissions on the remote file
echo "Setting correct permissions on the backup file..."
ssh "$VM_USER@$VM_IP" "sudo chown $VM_USER:$VM_USER $REMOTE_DIR/$BACKUP_FILE && sudo chmod 644 $REMOTE_DIR/$BACKUP_FILE"

# Verify the file was copied successfully
echo "Verifying backup file on VM..."
ssh "$VM_USER@$VM_IP" "ls -la $REMOTE_DIR/$BACKUP_FILE"

echo "Backup file copied successfully to VM!"
echo "You can now run the restore script on the VM:"
echo "ssh $VM_USER@$VM_IP"
echo "cd $REMOTE_DIR"
echo "./scripts/restore_db.sh" 