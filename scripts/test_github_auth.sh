#!/bin/bash
set -e

# Define variables
GITHUB_USER="${GITHUB_USER:-}"
GITHUB_REPO="${GITHUB_REPO:-}"

echo "Testing GitHub authentication..."

# Check if GitHub user is provided
if [ -z "$GITHUB_USER" ]; then
    echo "Error: GitHub username not provided."
    echo "Please run this script with the GITHUB_USER environment variable:"
    echo "GITHUB_USER=your_username GITHUB_REPO=your_repo ./test_github_auth.sh"
    exit 1
fi

# Check if GitHub repo is provided
if [ -z "$GITHUB_REPO" ]; then
    echo "Error: GitHub repository name not provided."
    echo "Please run this script with the GITHUB_REPO environment variable:"
    echo "GITHUB_USER=your_username GITHUB_REPO=your_repo ./test_github_auth.sh"
    exit 1
fi

# Validate repository name (remove any trailing slashes or .git)
GITHUB_REPO=$(echo "$GITHUB_REPO" | sed 's/\/.*$//' | sed 's/\.git$//')
echo "Using repository name: $GITHUB_REPO"

# Create a temporary directory for testing
TEST_DIR="/tmp/github-auth-test-$(date +%s)"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Use the correct repository URL format
REPO_URL="https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git"
echo "Cloning repository from: $REPO_URL"

echo "Cloning repository to test authentication..."
git clone "$REPO_URL"

if [ $? -eq 0 ]; then
    echo "✅ GitHub authentication is working correctly!"
    echo "Repository cloned to $TEST_DIR/${GITHUB_REPO}"
else
    echo "❌ GitHub authentication failed. Please check your credentials."
    echo "Attempted to clone from: $REPO_URL"
    exit 1
fi

echo "Cleaning up test directory..."
cd ..
rm -rf "$TEST_DIR"

echo "GitHub authentication test completed successfully!" 