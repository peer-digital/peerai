#!/bin/bash
set -e

echo "=== GitHub Authentication Verification Tool ==="
echo "Running on: $(hostname)"
echo "Date: $(date)"
echo "User: $(whoami)"
echo ""

# Check environment variables
echo "=== Environment Variables ==="
echo "GITHUB_USER: ${GITHUB_USER:-Not set}"
echo "GITHUB_REPO: ${GITHUB_REPO:-Not set}"
echo "GITHUB_TOKEN: ${GITHUB_TOKEN:+Set (value hidden)}"
if [ -z "$GITHUB_USER" ] || [ -z "$GITHUB_REPO" ] || [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: One or more required environment variables are not set"
  exit 1
fi
echo ""

# Check Git configuration
echo "=== Git Configuration ==="
git config --global --get user.name || echo "Git user.name not set"
git config --global --get user.email || echo "Git user.email not set"
git config --global --get credential.helper || echo "Git credential.helper not set"
echo ""

# Test GitHub API access
echo "=== GitHub API Access Test ==="
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" -H "Authorization: token ${GITHUB_TOKEN}" "https://api.github.com/user" || echo "Failed to access GitHub API"
echo ""

# Test repository access
echo "=== Repository Access Test ==="
REPO_URL="https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git"
echo "Testing access to: ${REPO_URL}"
git ls-remote --exit-code ${REPO_URL} >/dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "SUCCESS: Repository is accessible"
else
  echo "ERROR: Repository is not accessible"
  echo "Trying with token authentication..."
  git ls-remote --exit-code https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${GITHUB_REPO}.git >/dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "SUCCESS: Repository is accessible with token authentication"
  else
    echo "ERROR: Repository is not accessible even with token authentication"
    exit 1
  fi
fi
echo ""

echo "=== GitHub Authentication Verification Complete ===" 