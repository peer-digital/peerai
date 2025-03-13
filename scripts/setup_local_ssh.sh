#!/bin/bash
set -e

echo "=== Setting up local SSH key for VM access ==="
echo "Date: $(date)"
echo "User: $(whoami)"
echo ""

# Define variables
VM_IP="158.174.210.91"
VM_USER="ubuntu"
SSH_DIR="$HOME/.ssh"
SSH_KEY_FILE="$SSH_DIR/id_rsa"
SSH_PUB_FILE="$SSH_DIR/id_rsa.pub"

# Create SSH directory if it doesn't exist
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

# Check if we need to create a new key
if [ ! -f "$SSH_KEY_FILE" ] || [ ! -f "$SSH_PUB_FILE" ]; then
    echo "SSH key not found, creating a new one..."
    
    # Backup existing keys if they exist
    if [ -f "$SSH_KEY_FILE" ]; then
        echo "Backing up existing private key..."
        cp "$SSH_KEY_FILE" "$SSH_KEY_FILE.bak.$(date +%s)"
    fi
    
    if [ -f "$SSH_PUB_FILE" ]; then
        echo "Backing up existing public key..."
        cp "$SSH_PUB_FILE" "$SSH_PUB_FILE.bak.$(date +%s)"
    fi
    
    # Create the private key file with the correct permissions
    echo "Creating private key file..."
    cat > "$SSH_KEY_FILE" << 'EOF'
-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEAvIJx7Z2HRCZZYUN80T6GiZNlOkHZv+LeOl8Np9rGvHCZNjiK
+71J9lPGNACYRDqR4JiIX2gq7298Nq5i9jNzp/9mWxBJhDsLg9QREjJwNmVUnhlr
Bxcki82fHS72QOgMIoMvOF+HGzXHAncDtmsQ5TfNihJ5jnrTBC38KgZTsrjir+Da
Tl+OXWIrw91vBMw9GnOcpZ24yFzQdcKRdb9YiS+mBNXVyNgR/dnY0SvGITJI5/Y7
1eOQiG+reuT8Yx0ifyRIHz0fd+XqhdtQ+lORkTmYp6gVV//CUsFmh12yw0Y0Pu57
ctFV295b0v7Oqb+oo3WNa+vWiW6fnheFbHoc5wIDAQABAoIBAFc+W/Hn1SGSSg18
yXih4mwrnk7fCSMIoWcMdOp5kz7FMfNpKdGmYmOxk+qfV9lD7h2vGnZlZHGZ/Dfm
b4CYgW+AAWQl3pBnL0Yc0KXGWC6kqQveoa0PZeeaC4jbIjcZ7fvPEPybIZFTSz51
zG8RkCk1sVe0gzOQ3rZxfeIJOZVdtSgPWQ1PIpgNLtQEWq+1nB7frZ6T0aDarhjp
OAy5U6uQ6gSw1zUE4ELU639+1DJIfjtY/BCuhXN+1GhmiuohN0GL+7rx+cIg+TmP
eXgy+fXjGo0kWvIroIiwgz1NM493DTRvNkjwxLNBRifSVoNKdgq57xG4ym3WIZL7
bEcFWrkCgYEA95nwKYE+Gb/qek++P+XDRm3pmeT1qT64ZU88BQL4Ej1uriC1TCUs
shlLPifbG3Mw4fkCUv1tRV+r3IYPRHv1M7X8ZH+m29EooHL6pig0r49s7Yfvrkd6
JKCAiYSNWMrvTH4M8+eBap+nNSvod82sL+NT41D33/RQize3SwKddKUCgYEAwudh
Nu10ggzjfhfeaHArEmeInSwn3no8fHknDnHn6NjI5a40K6Iql2xkas1I1jjIMsyx
L6uQS/gnxEK9BzFrmDvBRU+cKp3ldjYm2xWsHIyqbD4FfqaGYvVNUDAKjmlzMxyq
LCkm767Zv4eGcHhsN7m+ElyV0eEQ86JRex7w+ZsCgYAx8ChSFrERvHVsSd0TQiIK
eGyfD2DEy9OhC0QNtrWV6DIEiLBINU84dIWKebtlY+w+B10Co/5/+XXOOnOl2mJw
FYpcMqrStvK8ubP4Ay/tIL5Vgg9DVUM7U+vY0JU5jWSKRvoRz2V4vc6ZmMuALklG
N1FaDaCQ2NPN4GTlihd7yQKBgBVjfu+gL2D2OSDlTar4ZEGoyv00k0t+7pRaV0bm
iSSsZZ+O9nqzWSk04/A0hwG7SX0JqYgps7Qij3qiOExJyBz0sckBa4nhugS2/Jye
TDz10t3+EGxNqgHCGbHrE719JP8+7g3alkNHVO4H2WEOVhHneExbjLVzlYCnF3oD
cz5xAoGAfd95CwABCBFH6YuoBlUEYMGeb66Fvqt8PhnY8IvxAmKetqx5IVYTT4zY
Qd/BG89A1vhOOOUJVtD6XNZWRFZz5TOIKxX29258H22N9Etp7J2otEiGx9U275Z9
ROlZkXKBhVb/utLHA9tgSa7+xfYx47ylW8H0ZHjhawTbsMgjM60=
-----END RSA PRIVATE KEY-----
EOF
    chmod 600 "$SSH_KEY_FILE"
    
    # Create the public key file
    echo "Creating public key file..."
    cat > "$SSH_PUB_FILE" << 'EOF'
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC8gnHtnYdEJllhQ3zRPoaJk2U6Qdm/4t46Xw2n2sa8cJk2OIr7vUn2U8Y0AJhEOpHgmIhfaCrvb3w2rmL2M3On/2ZbEEmEOwuD1BESMnA2ZVSeGWsHFySLzZ8dLvZA6Awigy84X4cbNccCdwO2axDlN82KEnmOetMELfwqBlOyuOKv4NpOX45dYivD3W8EzD0ac5ylnbjIXNB1wpF1v1iJL6YE1dXI2BH92djRK8YhMkjn9jvV45CIb6t65PxjHSJ/JEgfPR935eqF21D6U5GROZinqBVX/8JSwWaHXbLDRjQ+7nty0VXb3lvS/s6pv6ijdY1r69aJbp+eF4Vsehzn Generated-by-Nova
EOF
    chmod 644 "$SSH_PUB_FILE"
    
    echo "SSH key pair created successfully."
else
    echo "SSH key already exists at $SSH_KEY_FILE"
fi

# Update known_hosts file
echo "Updating SSH known_hosts file to accept the VM host key..."
ssh-keygen -R $VM_IP
ssh-keyscan -H $VM_IP >> "$SSH_DIR/known_hosts"

echo "Testing SSH connection to VM..."
# Use -o StrictHostKeyChecking=no to automatically accept the host key
# Use -o IdentitiesOnly=yes to only use the specified key
ssh -o StrictHostKeyChecking=no -o IdentitiesOnly=yes -i "$SSH_KEY_FILE" $VM_USER@$VM_IP "echo 'SSH connection successful!'; exit"

if [ $? -eq 0 ]; then
    echo "✅ SSH connection to VM successful!"
    echo "You can now use the following command to SSH into the VM:"
    echo "  ssh -i $SSH_KEY_FILE $VM_USER@$VM_IP"
else
    echo "❌ SSH connection to VM failed."
    echo "Please check that:"
    echo "  1. The VM is running and accessible"
    echo "  2. The SSH key is correctly configured on the VM"
    echo "  3. The VM's firewall allows SSH connections"
    exit 1
fi

echo "=== SSH Setup Complete ===" 