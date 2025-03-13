#!/bin/bash
set -e

# Define variables
SSH_DIR="/home/ubuntu/.ssh"
AUTHORIZED_KEYS="$SSH_DIR/authorized_keys"

# Create .ssh directory if it doesn't exist
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

# Add the public key to authorized_keys
cat > "$AUTHORIZED_KEYS" << EOL
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC8gnHtnYdEJllhQ3zRPoaJk2U6Qdm/4t46Xw2n2sa8cJk2OIr7vUn2U8Y0AJhEOpHgmIhfaCrvb3w2rmL2M3On/2ZbEEmEOwuD1BESMnA2ZVSeGWsHFySLzZ8dLvZA6Awigy84X4cbNccCdwO2axDlN82KEnmOetMELfwqBlOyuOKv4NpOX45dYivD3W8EzD0ac5ylnbjIXNB1wpF1v1iJL6YE1dXI2BH92djRK8YhMkjn9jvV45CIb6t65PxjHSJ/JEgfPR935eqF21D6U5GROZinqBVX/8JSwWaHXbLDRjQ+7nty0VXb3lvS/s6pv6ijdY1r69aJbp+eF4Vsehzn Generated-by-Nova
EOL

# Set proper permissions
chmod 600 "$AUTHORIZED_KEYS"
chown -R ubuntu:ubuntu "$SSH_DIR"

echo "SSH key setup completed successfully" 