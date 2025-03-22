#!/bin/bash
set -e

echo "Building frontend..."
cd frontend/admin-dashboard
npm install
npm run build

echo "Frontend build complete. The application is now ready to be served from the backend."
echo "To start the application, run: uvicorn backend.main:app --reload" 