#!/bin/bash
set -e

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
GITHUB_USER="${GITHUB_USER:-}"
GITHUB_REPO="${GITHUB_REPO:-}"

echo "Setting up GitHub authentication..."

# Check if GitHub user is provided
if [ -z "$GITHUB_USER" ]; then
    echo "Error: GitHub username not provided."
    echo "Please run this script with the GITHUB_USER environment variable:"
    echo "GITHUB_USER=your_username GITHUB_REPO=your_repo ./setup_github_auth.sh"
    exit 1
fi

# Check if GitHub repo is provided
if [ -z "$GITHUB_REPO" ]; then
    echo "Error: GitHub repository name not provided."
    echo "Please run this script with the GITHUB_REPO environment variable:"
    echo "GITHUB_USER=your_username GITHUB_REPO=your_repo ./setup_github_auth.sh"
    exit 1
fi

# Print debug information
echo "Debug information:"
echo "GITHUB_USER: $GITHUB_USER"
echo "GITHUB_REPO: $GITHUB_REPO"
if [ -n "$GITHUB_TOKEN" ]; then
    echo "GITHUB_TOKEN: [hidden for security]"
else
    echo "GITHUB_TOKEN: Not provided (using public repository access)"
fi

# Set Git user information
echo "Setting Git user information..."
git config --global user.name "${GITHUB_USER}"
git config --global user.email "${GITHUB_USER}@users.noreply.github.com"

# Test the authentication by cloning the repository
echo "Testing GitHub authentication by cloning the repository..."
if [ -d "$APP_DIR" ]; then
    echo "Directory $APP_DIR already exists, removing it..."
    rm -rf "$APP_DIR"
fi

# Use the public repository URL for cloning
REPO_URL="https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git"
echo "Cloning repository from: $REPO_URL"

# Clone the repository
git clone "$REPO_URL" "$APP_DIR"

if [ $? -eq 0 ]; then
    echo "✅ Repository cloned successfully!"
    echo "Repository cloned to $APP_DIR"
else
    echo "❌ Failed to clone the repository."
    echo "Attempted to clone from: $REPO_URL"
    exit 1
fi

echo "GitHub authentication setup completed successfully!" 