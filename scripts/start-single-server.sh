#!/bin/bash

# Start all services for Peer AI on a single server
# This script should be run from the project root directory

# Set environment variables
export ENVIRONMENT=${ENVIRONMENT:-development}
export JWT_SECRET_KEY=${JWT_SECRET_KEY:-change_me_in_production}
export MOCK_MODE=${MOCK_MODE:-true}

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null || ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker and Docker Compose are required to run this script."
    echo "Please install Docker Desktop (https://www.docker.com/products/docker-desktop/)"
    exit 1
fi

# Build and start all services
echo "Starting Peer AI services..."
docker-compose down
docker-compose build
docker-compose up -d

# Wait for all services to be ready
echo "Waiting for services to start..."
sleep 5

# Run migrations
echo "Running database migrations..."
docker-compose exec backend alembic upgrade head

echo "Setup complete! Peer AI is running at:"
echo "Frontend: http://localhost"
echo "API: http://localhost/api"
echo "API Documentation: http://localhost/docs"
echo ""
echo "To stop all services, run: docker-compose down" 