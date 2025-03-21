#!/bin/bash
set -e

# Thorough cleanup script for PeerAI deployment
echo "=== Starting thorough VM cleanup ==="

# Stop all related services
echo "=== Stopping services ==="
sudo systemctl stop peerai-backend 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true

# Remove previous deployment artifacts
echo "=== Removing deployment artifacts ==="
rm -f ~/backend-code.tar.gz
rm -f ~/frontend-build.tar.gz
rm -f ~/scripts.tar.gz
rm -f ~/.env.example
rm -rf ~/deploy-temp
rm -rf ~/docker-compose-files.tar.gz

# Clean existing app directories but maintain structure
echo "=== Cleaning application directories ==="
mkdir -p ~/peer-ai/backend
mkdir -p ~/peer-ai/frontend/admin-dashboard/dist
mkdir -p ~/peer-ai/deployment
mkdir -p ~/peer-ai/logs

# Clean content but keep the directories
rm -rf ~/peer-ai/backend/*
rm -rf ~/peer-ai/frontend/admin-dashboard/dist/*
rm -rf ~/peer-ai/deployment/*

# Clean up virtual environments to ensure fresh dependencies
echo "=== Cleaning virtual environments ==="
rm -rf ~/peer-ai/backend/venv

# Reset nginx configuration
echo "=== Resetting nginx configuration ==="
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-enabled/peerai
sudo rm -f /etc/nginx/sites-available/peerai

# Restart nginx with default configuration
echo "=== Restarting nginx with default configuration ==="
sudo systemctl restart nginx || true

# Check for stray processes
echo "=== Checking for stray processes ==="
ps aux | grep "[p]ython.*uvicorn" || true
ps aux | grep "[n]ode.*react" || true

# Kill any stray processes if needed
pkill -f "uvicorn backend.main:app" 2>/dev/null || true

# Display disk space
echo "=== Current disk space usage ==="
df -h /

echo "=== Cleanup completed successfully ==="
echo "The VM is now ready for a fresh deployment." 