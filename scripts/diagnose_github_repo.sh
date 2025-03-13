#!/bin/bash
set -e

# Define variables
GITHUB_USER="${GITHUB_USER:-}"
GITHUB_REPO="${GITHUB_REPO:-}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

echo "Diagnosing GitHub repository access..."

# Check if GitHub user is provided
if [ -z "$GITHUB_USER" ]; then
    echo "Error: GitHub username not provided."
    echo "Please run this script with the GITHUB_USER environment variable:"
    echo "GITHUB_USER=your_username GITHUB_REPO=your_repo ./diagnose_github_repo.sh"
    exit 1
fi

# Check if GitHub repo is provided
if [ -z "$GITHUB_REPO" ]; then
    echo "Error: GitHub repository name not provided."
    echo "Please run this script with the GITHUB_REPO environment variable:"
    echo "GITHUB_USER=your_username GITHUB_REPO=your_repo ./diagnose_github_repo.sh"
    exit 1
fi

# Validate repository name (remove any trailing slashes or .git)
CLEAN_REPO=$(echo "$GITHUB_REPO" | sed 's/\/.*$//' | sed 's/\.git$//')
echo "Clean repository name: $CLEAN_REPO"

# Check if the repository exists using GitHub API
echo "Checking if repository exists..."
if [ -n "$GITHUB_TOKEN" ]; then
    # Use token for authentication if provided
    REPO_CHECK=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/repos/$GITHUB_USER/$CLEAN_REPO")
else
    # Anonymous check if no token provided
    REPO_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "https://api.github.com/repos/$GITHUB_USER/$CLEAN_REPO")
fi

if [ "$REPO_CHECK" = "200" ]; then
    echo "✅ Repository exists: https://github.com/$GITHUB_USER/$CLEAN_REPO"
else
    echo "❌ Repository not found: https://github.com/$GITHUB_USER/$CLEAN_REPO (HTTP status: $REPO_CHECK)"
    echo "Please check the repository name and your access permissions."
    
    # Try to list user's repositories
    echo "Listing available repositories for user $GITHUB_USER..."
    if [ -n "$GITHUB_TOKEN" ]; then
        # Use token for authentication if provided
        REPOS=$(curl -s -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/users/$GITHUB_USER/repos?per_page=5" | grep -o '"name": "[^"]*' | cut -d'"' -f4)
    else
        # Anonymous check if no token provided
        REPOS=$(curl -s "https://api.github.com/users/$GITHUB_USER/repos?per_page=5" | grep -o '"name": "[^"]*' | cut -d'"' -f4)
    fi
    
    if [ -n "$REPOS" ]; then
        echo "Available repositories (showing up to 5):"
        echo "$REPOS"
    else
        echo "Could not list repositories. The user might not exist or might not have public repositories."
    fi
    
    exit 1
fi

# Test different repository URL formats
echo "Testing repository URL formats..."

# Format 1: https://github.com/user/repo.git
URL1="https://github.com/$GITHUB_USER/$CLEAN_REPO.git"
echo "Testing: $URL1"
if curl -s --head "$URL1" | grep -q "HTTP/2 200"; then
    echo "✅ URL is accessible: $URL1"
else
    echo "❌ URL is not accessible: $URL1"
fi

# Format 2: https://github.com/user/repo
URL2="https://github.com/$GITHUB_USER/$CLEAN_REPO"
echo "Testing: $URL2"
if curl -s --head "$URL2" | grep -q "HTTP/2 200"; then
    echo "✅ URL is accessible: $URL2"
else
    echo "❌ URL is not accessible: $URL2"
fi

echo "GitHub repository diagnosis completed."
echo "Recommended repository URL: https://github.com/$GITHUB_USER/$CLEAN_REPO.git" 