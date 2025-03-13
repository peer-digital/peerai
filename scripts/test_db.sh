#!/bin/bash
set -e

echo "=== Database Test Tool ==="
echo "Date: $(date)"
echo "User: $(whoami)"
echo ""

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
BACKEND_DIR="$APP_DIR/backend"
VENV_DIR="$BACKEND_DIR/venv"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_SCRIPT="$SCRIPT_DIR/test_db_connection.py"

# Check if we're on the VM
if [[ "$(hostname)" != *"ubuntu"* ]] && [[ "$(whoami)" != "ubuntu" ]]; then
    echo "This script must be run on the VM."
    echo "Please connect to the VM first using ./scripts/connect_to_vm.sh"
    exit 1
fi

# Check if the backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "Error: Backend directory not found at $BACKEND_DIR"
    exit 1
fi

# Check if the test script exists
if [ ! -f "$TEST_SCRIPT" ]; then
    echo "Error: Test script not found at $TEST_SCRIPT"
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# Make the test script executable
chmod +x "$TEST_SCRIPT"

# Run the test script
echo "Running database test script..."
python "$TEST_SCRIPT"

if [ $? -eq 0 ]; then
    echo "✅ Database test completed successfully!"
else
    echo "❌ Database test failed."
    exit 1
fi

echo "=== Database Test Complete ===" 