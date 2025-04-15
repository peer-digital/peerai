#!/bin/bash

# deploy.sh - Server-side deployment tasks for PeerAI
# @description: Configures and restarts the systemd service ON THE VM.
# Assumes backend code and frontend build are already deployed.
# Assumes environment variables are passed by the calling process (GitHub Actions SSH step).

# Stop script on errors
set -e

DEPLOY_DIR="/home/ubuntu/peer-ai"
CREDENTIALS_FILE="$DEPLOY_DIR/google-creds.json"

# Debug: Print environment variable status (confirming they are passed)
echo "Checking environment variables received by deploy.sh on VM:"
# Check a few key variables passed by the workflow
for var in DATABASE_URL JWT_SECRET_KEY PORT ENVIRONMENT; do
  if [ ! -z "${!var}" ]; then
    echo "$var is set"
  else
    echo "ERROR: Required environment variable $var is NOT set within deploy.sh context!"
    exit 1
  fi
done

# --- Add a check for the google credentials file ---
echo "Verifying Google credentials file..."
if [ -f "$CREDENTIALS_FILE" ]; then
  echo "Google credentials file verified at $CREDENTIALS_FILE"
  if [ ! -r "$CREDENTIALS_FILE" ]; then
    echo "ERROR: Google credentials file is not readable at $CREDENTIALS_FILE"
    exit 1
  fi
else
  echo "ERROR: Google credentials file NOT found at $CREDENTIALS_FILE"
  exit 1
fi
# --- End check ---

# Create/Update systemd service file with environment variables from the workflow
echo "Creating/Updating systemd service file: /etc/systemd/system/peerai-backend.service"
# Use sudo tee to write the file content. Ensure variables are expanded correctly.
# Use double quotes around the whole VAR=VALUE assignment for safety
sudo tee /etc/systemd/system/peerai-backend.service > /dev/null << EOF
[Unit]
Description=PeerAI Backend Service
After=network.target

[Service]
User=1000
Group=1000
WorkingDirectory=$DEPLOY_DIR
# Pass environment variables directly to the service
# Use the variables provided by the GitHub Actions 'envs' parameter
Environment="PYTHONPATH=$DEPLOY_DIR"
Environment="DATABASE_URL=$DATABASE_URL"
Environment="EXTERNAL_LLM_API_KEY=$EXTERNAL_LLM_API_KEY"
Environment="HOSTED_LLM_API_KEY=$HOSTED_LLM_API_KEY"
Environment="JWT_SECRET_KEY=$JWT_SECRET_KEY"
Environment="GOOGLE_APPLICATION_CREDENTIALS=$CREDENTIALS_FILE"
Environment="PORT=$PORT"
Environment="ACCESS_TOKEN_EXPIRE_MINUTES=$ACCESS_TOKEN_EXPIRE_MINUTES"
Environment="RATE_LIMIT_MINUTE=$RATE_LIMIT_MINUTE"
Environment="RATE_LIMIT_DAILY=$RATE_LIMIT_DAILY"
Environment="ENVIRONMENT=$ENVIRONMENT"
Environment="ALLOWED_ORIGIN=$ALLOWED_ORIGIN"
Environment="EXTERNAL_MODEL=$EXTERNAL_MODEL"
Environment="EXTERNAL_LLM_URL=$EXTERNAL_LLM_URL"
Environment="DEBUG=$DEBUG"
Environment="MOCK_MODE=$MOCK_MODE"
Environment="LOG_LEVEL=$LOG_LEVEL"
Environment="GOOGLE_WORKSPACE_ADMIN_EMAIL=$GOOGLE_WORKSPACE_ADMIN_EMAIL"
Environment="NOTIFICATION_EMAIL_ALIAS=$NOTIFICATION_EMAIL_ALIAS"
Environment="VITE_TEST_EMAIL=$VITE_TEST_EMAIL"
Environment="VITE_TEST_PASSWORD=$VITE_TEST_PASSWORD"
Environment="JWT_ALGORITHM=$JWT_ALGORITHM"
Environment="VITE_API_BASE_URL=$VITE_API_BASE_URL"
Environment="VITE_APP_ENV=$VITE_APP_ENV"
Environment="VITE_AUTH_ENABLED=$VITE_AUTH_ENABLED"
Environment="API_V1_PREFIX=/api/v1"
# Ensure the python virtual environment path is correct
ExecStart=$DEPLOY_DIR/.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port $PORT
Restart=always
# Ensure PATH includes the venv if needed, though ExecStart uses absolute path
Environment="PATH=$DEPLOY_DIR/.venv/bin:/usr/bin"

[Install]
WantedBy=multi-user.target
EOF

echo "Systemd service file updated (removed all inline comments)."

# Reload systemd, enable and restart the service
echo "Reloading systemd and restarting peerai-backend service..."
sudo systemctl daemon-reload
sudo systemctl enable peerai-backend.service
sudo systemctl restart peerai-backend.service

echo "peerai-backend service restart command issued."

# --- Run the model seeding script ---
echo "Running model seeding script (only if no models exist in the database)..."
# Use the python executable from the virtual environment
# The environment variables (DATABASE_URL, EXTERNAL_LLM_API_KEY) are available
# because they are passed by the GitHub Actions ssh-action 'envs' parameter.
$DEPLOY_DIR/.venv/bin/python -m backend.scripts.seed_mistral_models || {
  echo "WARNING: Model seeding script failed, but deployment continues."
  echo "This may be due to database connection issues or API key problems."
  echo "You can manually run the script later if needed."
  # If you want seeding failure to STOP the deployment, uncomment the next line:
  # echo "ERROR: Model seeding script failed!" && exit 1
}
echo "Model seeding script finished."
# --- End model seeding script ---

# Optional: Add commands here to run database migrations if needed
# Example:
# echo "Running database migrations..."
# cd $DEPLOY_DIR
# source .venv/bin/activate  # @note: Or however you activate your environment
# alembic upgrade head  # @note: Or your migration command

echo "deploy.sh script finished successfully on VM."