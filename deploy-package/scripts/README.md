# Peer AI Deployment Scripts

This directory contains scripts for deploying and managing the Peer AI application.

## Core Deployment Scripts

- `deploy.sh`: Main deployment script that deploys the backend and configures the frontend
- `pre_deploy.sh`: Prepares the VM environment before deployment (installs dependencies, creates directories)
- `init_db.sh`: Initializes the PostgreSQL database, creates users and permissions
- `cleanup.sh`: Performs post-deployment cleanup, backup rotation, and system maintenance
- `check_deployment.sh`: Verifies the deployment status (services, API, database)

## Utility Scripts

- `backup_db.sh`: Creates database backups
- `pre_commit_tests.sh`: Runs tests before committing code
- `pre_launch_check.py`: Performs pre-production checks

## Deployment Process

The deployment process follows these steps:

1. **Pre-deployment**: Prepares the VM environment
   - Creates necessary directories
   - Installs dependencies
   - Configures services
   - Backs up the current database

2. **Database Initialization**: Sets up the database
   - Creates database if it doesn't exist
   - Creates database user if needed
   - Sets up permissions
   - Runs database migrations

3. **Deployment**: Deploys the application
   - Sets up environment variables
   - Installs backend dependencies
   - Creates systemd service
   - Configures Nginx
   - Restarts services

4. **Cleanup**: Post-deployment maintenance
   - Backs up the database
   - Rotates old backups
   - Cleans up temporary files
   - Cleans up logs

5. **Verification**: Checks deployment status
   - Verifies services are running
   - Checks API accessibility
   - Confirms database connection

## Database Connection Details

- Host: localhost
- Port: 5432
- Database: peerai_db
- Username: peerai
- Password: peerai_password # @note: Default database password 