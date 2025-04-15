#!/bin/bash

# check_models.sh - Script to check the current models in the database
# This is useful for debugging model configuration issues

# Stop script on errors
set -e

DEPLOY_DIR="/home/ubuntu/peer-ai"

echo "Checking models in the database..."
$DEPLOY_DIR/.venv/bin/python -m backend.check_models

echo "Done checking models."
