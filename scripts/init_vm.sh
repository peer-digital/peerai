#!/bin/bash
set -e

# Define variables
VM_IP="158.174.210.91"
VM_USER="ubuntu"
VM_PASSWORD="FSLw0dwl"
SSH_KEY_FILE="PrivateKey.rsa"
SSH_DIR="$HOME/.ssh"
KNOWN_HOSTS="$SSH_DIR/known_hosts"

echo "Initializing VM setup..."

# Create SSH directory if it doesn't exist
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

# Check if SSH key file exists
if [ ! -f "$SSH_KEY_FILE" ]; then
    echo "Error: SSH key file not found at $SSH_KEY_FILE"
    exit 1
fi

# Copy SSH key to ~/.ssh/id_rsa
cp "$SSH_KEY_FILE" "$SSH_DIR/id_rsa"
chmod 600 "$SSH_DIR/id_rsa"
echo "✅ SSH key copied to $SSH_DIR/id_rsa"

# Add VM to known hosts
ssh-keyscan -H "$VM_IP" >> "$KNOWN_HOSTS"
echo "✅ VM added to known hosts"

# Install sshpass if not already installed
if ! command -v sshpass &> /dev/null; then
    echo "Installing sshpass..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install sshpass
    else
        sudo apt-get update
        sudo apt-get install -y sshpass
    fi
    echo "✅ sshpass installed"
else
    echo "sshpass already installed"
fi

# Copy setup_ssh.sh to VM
echo "Copying SSH setup script to VM..."
sshpass -p "$VM_PASSWORD" scp scripts/setup_ssh.sh "$VM_USER@$VM_IP:/home/$VM_USER/"
echo "✅ SSH setup script copied to VM"

# Make script executable and run it
echo "Running SSH setup script on VM..."
sshpass -p "$VM_PASSWORD" ssh "$VM_USER@$VM_IP" "chmod +x /home/$VM_USER/setup_ssh.sh && /home/$VM_USER/setup_ssh.sh"
echo "✅ SSH setup script executed on VM"

echo "VM initialization completed successfully!"
echo "You can now SSH into the VM using: ssh $VM_USER@$VM_IP" 