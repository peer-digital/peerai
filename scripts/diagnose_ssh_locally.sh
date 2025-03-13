#!/bin/bash
set -e

echo "=== SSH Diagnostic Tool (Local) ==="
echo "Date: $(date)"
echo "User: $(whoami)"
echo "Hostname: $(hostname)"
echo ""

# Define variables
VM_IP="158.174.210.91"
VM_USER="ubuntu"
SSH_DIR="$HOME/.ssh"
SSH_KEY_FILE="$SSH_DIR/id_rsa"
SSH_PUB_FILE="$SSH_DIR/id_rsa.pub"

# Check SSH directory permissions
echo "Checking SSH directory permissions..."
if [ -d "$SSH_DIR" ]; then
    PERMS=$(stat -f "%Lp" "$SSH_DIR")
    echo "SSH directory permissions: $PERMS (should be 700)"
    if [ "$PERMS" != "700" ]; then
        echo "Fixing SSH directory permissions..."
        chmod 700 "$SSH_DIR"
    fi
else
    echo "SSH directory does not exist, creating it..."
    mkdir -p "$SSH_DIR"
    chmod 700 "$SSH_DIR"
fi

# Check if SSH key exists
echo "Checking SSH key..."
if [ -f "$SSH_KEY_FILE" ]; then
    PERMS=$(stat -f "%Lp" "$SSH_KEY_FILE")
    echo "Private key permissions: $PERMS (should be 600)"
    if [ "$PERMS" != "600" ]; then
        echo "Fixing private key permissions..."
        chmod 600 "$SSH_KEY_FILE"
    fi
    
    # Display key fingerprint
    echo "Private key fingerprint:"
    ssh-keygen -l -f "$SSH_KEY_FILE"
else
    echo "Private key does not exist at $SSH_KEY_FILE"
fi

if [ -f "$SSH_PUB_FILE" ]; then
    PERMS=$(stat -f "%Lp" "$SSH_PUB_FILE")
    echo "Public key permissions: $PERMS (should be 644)"
    if [ "$PERMS" != "644" ]; then
        echo "Fixing public key permissions..."
        chmod 644 "$SSH_PUB_FILE"
    fi
    
    # Display public key
    echo "Public key content:"
    cat "$SSH_PUB_FILE"
else
    echo "Public key does not exist at $SSH_PUB_FILE"
fi

# Check SSH agent
echo ""
echo "Checking SSH agent..."
if [ -z "$SSH_AUTH_SOCK" ]; then
    echo "SSH agent is not running"
    echo "Starting SSH agent..."
    eval "$(ssh-agent -s)"
else
    echo "SSH agent is running at $SSH_AUTH_SOCK"
fi

# List keys in SSH agent
echo "Keys in SSH agent:"
ssh-add -l || echo "No keys in SSH agent"

# Add key to SSH agent if not already added
if ! ssh-add -l | grep -q "$SSH_KEY_FILE"; then
    echo "Adding key to SSH agent..."
    ssh-add "$SSH_KEY_FILE" || echo "Failed to add key to SSH agent"
fi

# Test SSH connection with verbose output
echo ""
echo "Testing SSH connection to $VM_USER@$VM_IP with verbose output..."
ssh -v -o StrictHostKeyChecking=no -o IdentitiesOnly=yes -i "$SSH_KEY_FILE" $VM_USER@$VM_IP "echo 'SSH connection successful!'; exit" || echo "SSH connection failed"

# Provide next steps
echo ""
echo "=== Diagnostic Complete ==="
echo ""
echo "If SSH connection failed, here are some things to check:"
echo "1. Ensure the VM is running and accessible"
echo "2. Verify that the public key is added to the VM's authorized_keys file"
echo "3. Check that the VM's SSH service is running and properly configured"
echo "4. Verify that the VM's firewall allows SSH connections"
echo ""
echo "To add your public key to the VM's authorized_keys file, you would typically run:"
echo "  ssh-copy-id -i $SSH_KEY_FILE $VM_USER@$VM_IP"
echo ""
echo "If you have another way to access the VM (e.g., through a web console),"
echo "you can manually add your public key to /home/$VM_USER/.ssh/authorized_keys"
echo ""
echo "Your public key is:"
cat "$SSH_PUB_FILE" 