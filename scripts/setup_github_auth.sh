#!/bin/bash
set -e

# Define variables
APP_DIR="/home/ubuntu/peer-ai"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
GITHUB_USER="${GITHUB_USER:-}"
GITHUB_REPO="${GITHUB_REPO:-}"

echo "Setting up GitHub authentication..."

# Check if GitHub token is provided
if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GitHub token not provided."
    echo "Please run this script with the GITHUB_TOKEN environment variable:"
    echo "GITHUB_TOKEN=your_token GITHUB_USER=your_username GITHUB_REPO=your_repo ./setup_github_auth.sh"
    exit 1
fi

# Check if GitHub user is provided
if [ -z "$GITHUB_USER" ]; then
    echo "Error: GitHub username not provided."
    echo "Please run this script with the GITHUB_USER environment variable:"
    echo "GITHUB_TOKEN=your_token GITHUB_USER=your_username GITHUB_REPO=your_repo ./setup_github_auth.sh"
    exit 1
fi

# Check if GitHub repo is provided
if [ -z "$GITHUB_REPO" ]; then
    echo "Error: GitHub repository name not provided."
    echo "Please run this script with the GITHUB_REPO environment variable:"
    echo "GITHUB_TOKEN=your_token GITHUB_USER=your_username GITHUB_REPO=your_repo ./setup_github_auth.sh"
    exit 1
fi

# Configure Git to use the token for HTTPS authentication
echo "Configuring Git credentials..."
git config --global credential.helper store
echo "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials

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

# Use the correct repository URL format
REPO_URL="https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git"
echo "Cloning repository from: $REPO_URL"
git clone "$REPO_URL" "$APP_DIR"

if [ $? -eq 0 ]; then
    echo "✅ GitHub authentication setup completed successfully!"
    echo "Repository cloned to $APP_DIR"
else
    echo "❌ Failed to clone the repository. Please check your token and repository name."
    echo "Attempted to clone from: $REPO_URL"
    exit 1
fi

echo "GitHub authentication setup completed successfully!" 