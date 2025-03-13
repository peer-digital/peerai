#!/bin/bash
set -e

# Define variables
VM_IP="158.174.210.91"
VM_USER="ubuntu"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
GITHUB_USER="${GITHUB_USER:-}"
GITHUB_REPO="${GITHUB_REPO:-}"

echo "Setting up GitHub authentication on VM..."

# Check if GitHub token is provided
if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GitHub token not provided."
    echo "Please run this script with the GITHUB_TOKEN environment variable:"
    echo "GITHUB_TOKEN=your_token GITHUB_USER=your_username GITHUB_REPO=your_repo ./manual_github_setup.sh"
    exit 1
fi

# Check if GitHub user is provided
if [ -z "$GITHUB_USER" ]; then
    echo "Error: GitHub username not provided."
    echo "Please run this script with the GITHUB_USER environment variable:"
    echo "GITHUB_TOKEN=your_token GITHUB_USER=your_username GITHUB_REPO=your_repo ./manual_github_setup.sh"
    exit 1
fi

# Check if GitHub repo is provided
if [ -z "$GITHUB_REPO" ]; then
    echo "Error: GitHub repository name not provided."
    echo "Please run this script with the GITHUB_REPO environment variable:"
    echo "GITHUB_TOKEN=your_token GITHUB_USER=your_username GITHUB_REPO=your_repo ./manual_github_setup.sh"
    exit 1
fi

# Validate repository name (remove any trailing slashes or .git)
GITHUB_REPO=$(echo "$GITHUB_REPO" | sed 's/\/.*$//' | sed 's/\.git$//')
echo "Using repository name: $GITHUB_REPO"

# Copy the GitHub authentication script to the VM
echo "Copying GitHub authentication script to VM..."
scp scripts/setup_github_auth.sh "$VM_USER@$VM_IP:/home/$VM_USER/"

# Make the script executable and run it
echo "Running GitHub authentication script on VM..."
ssh "$VM_USER@$VM_IP" "chmod +x /home/$VM_USER/setup_github_auth.sh && GITHUB_TOKEN='$GITHUB_TOKEN' GITHUB_USER='$GITHUB_USER' GITHUB_REPO='$GITHUB_REPO' /home/$VM_USER/setup_github_auth.sh"

echo "GitHub authentication setup on VM completed successfully!" 