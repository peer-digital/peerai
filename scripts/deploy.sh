#!/bin/bash
set -e

# Main deployment script for PeerAI
echo "Starting PeerAI deployment..."

# Create project directories if they don't exist
mkdir -p ~/peer-ai/frontend/admin-dashboard/dist
mkdir -p ~/peer-ai/backend
mkdir -p ~/peer-ai/deployment

# Check if backend code exists
if [ ! -d "backend" ]; then
  echo "Error: Backend code not found. Make sure you're running this from the project root."
  exit 1
fi

# Check if frontend build exists
if [ ! -d "frontend/admin-dashboard/dist" ]; then
  echo "Warning: Frontend build not found. Building frontend..."
  cd frontend/admin-dashboard
  npm install
  npm run build
  cd ../../
fi

# Deploy backend code
echo "Deploying backend code..."
cd ~/peer-ai
# Create Python virtual environment if it doesn't exist
if [ ! -d "backend/venv" ]; then
  echo "Creating Python virtual environment..."
  cd backend
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  cd ..
else
  echo "Using existing Python virtual environment..."
  cd backend
  source venv/bin/activate
  pip install -r requirements.txt
  cd ..
fi

# Deploy frontend
echo "Deploying frontend..."
cp -r frontend/admin-dashboard/dist/* ~/peer-ai/frontend/admin-dashboard/dist/
echo "Frontend deployed successfully."

# Restart services
echo "Restarting services..."
sudo systemctl restart nginx
sudo systemctl restart peerai-backend

# Check if services are running
echo "Checking service status..."
sudo systemctl status nginx --no-pager
sudo systemctl status peerai-backend --no-pager

echo "Deployment completed successfully!"
echo "Frontend available at: http://$(hostname -I | awk '{print $1}')"
echo "API available at: http://$(hostname -I | awk '{print $1}')/api" 