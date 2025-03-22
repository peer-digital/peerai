# Deployment Guide

This guide explains how to deploy the PeerAI application to a single VM running Ubuntu 24.04 LTS.

## VM Specifications

- **Status**: Active
- **Image**: Ubuntu 24.04 LTS
- **CPU**: 1
- **RAM**: 1024 MB
- **Volume**: 10 GB
- **IP**: 158.174.210.91
- **Fixed IP**: 10.0.0.16
- **MAC address**: fa:16:3e:20:b7:c5
- **User**: ubuntu
- **Password**: FSLw0dwl (for initial setup only, SSH keys should be used after setup)

## Architecture Overview

The deployment consists of:

1. **Frontend**: React application built with Vite
2. **Backend**: FastAPI Python application
3. **Database**: PostgreSQL
4. **Web Server**: Nginx for serving the frontend and proxying API requests

All components run on a single VM with the following ports:
- 80: HTTP (Nginx)
- 8000: Backend API (FastAPI)
- 5432: PostgreSQL (internal only)

## Prerequisites

### 1. GitHub Personal Access Token (PAT)

Since GitHub requires two-factor authentication (2FA), you need to create a Personal Access Token:

1. Go to your GitHub account settings
2. Navigate to Developer settings > Personal access tokens > Fine-grained tokens
3. Click "Generate new token"
4. Set the following:
   - Token name: `PeerAI Deployment`
   - Expiration: Choose an appropriate expiration date
   - Repository access: Select "Only select repositories" and choose your peer-ai repository
   - Permissions: Grant at least "Contents: Read and write" permission
5. Click "Generate token"
6. Copy the generated token (you'll need it for deployment)

### 2. Add Secrets to GitHub Repository

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Add the following secrets:
   - `SSH_PRIVATE_KEY`: The contents of the `PrivateKey.rsa` file
   - `GH_PAT`: The Personal Access Token you created in the previous step

### 3. Verify Repository Information

Before deploying, make sure you have the correct repository information:

1. **Organization/Username**: Your GitHub username or organization name (e.g., `peer-digital`)
2. **Repository Name**: The exact name of your repository (e.g., `peer-ai`)

You can verify your repository information by running:
```bash
./scripts/diagnose_github_repo.sh
```

This script will check if the repository exists and is accessible.

## Deployment Methods

### Method 1: GitHub Actions (Recommended)

1. Go to the Actions tab in your GitHub repository
2. Select the "Manual Deployment" workflow
3. Click "Run workflow"
4. Select "production" as the environment
5. Click "Run workflow"

The GitHub Actions workflow will automatically:
- Set up the VM if it's the first deployment
- Deploy the application
- Run database migrations
- Initialize the database with a default admin user (admin@example.com / password)
- Check the deployment status

### Method 2: Manual Deployment

1. **SSH into the VM**:
   ```
   ssh ubuntu@158.174.210.91
   ```

2. **Set up GitHub authentication**:
   ```
   # Run locally
   GITHUB_TOKEN=your_token GITHUB_USER=your_username GITHUB_REPO=peer-ai ./scripts/manual_github_setup.sh
   ```

3. **Run the setup script**:
   ```
   # Run on VM
   chmod +x scripts/setup_vm.sh
   ./scripts/setup_vm.sh
   ```

4. **Set up SSH keys**:
   ```
   # Run on VM
   chmod +x scripts/setup_ssh.sh
   ./scripts/setup_ssh.sh
   ```

5. **Fix file permissions**:
   ```
   # Run on VM
   chmod +x scripts/fix_permissions.sh
   ./scripts/fix_permissions.sh
   ```

6. **Run the deployment script**:
   ```
   # Run on VM
   cd /home/ubuntu/peer-ai
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

## Database Management

### Backup

The system is configured to automatically back up the database daily at 2 AM. You can also manually trigger a backup:

```
cd /home/ubuntu/peer-ai
./scripts/backup_db.sh
```

Backups are stored in `/home/ubuntu/peer-ai/backups/`.

### Database Initialization

The deployment process uses Alembic migrations to initialize and update the database schema. The database backup restoration has been disabled due to permission issues.

During deployment, you will be prompted if you want to initialize the database with basic data, including a default admin user. This is handled by the `init_db.sh` script.

You can also manually run the database initialization script:

```
cd /home/ubuntu/peer-ai
chmod +x scripts/init_db.sh
./scripts/init_db.sh
```

This will create a default admin user with the following credentials:
- Email: admin@example.com
- Password: password

**Note**: You should change this password immediately after first login.

If you need to manually initialize the database with specific data:

1. Connect to the database:
   ```
   sudo -u postgres psql -d peerai_db
   ```

2. Run SQL commands to insert your data:
   ```sql
   INSERT INTO your_table (column1, column2) VALUES ('value1', 'value2');
   ```

3. Or use a SQL script:
   ```
   sudo -u postgres psql -d peerai_db -f your_script.sql
   ```

## Monitoring and Maintenance

### Checking Service Status

```
sudo systemctl status peerai.service
sudo systemctl status nginx
sudo systemctl status postgresql
```

### Viewing Logs

```
# Backend logs
sudo journalctl -u peerai.service -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Database logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Backup logs
tail -f /home/ubuntu/peer-ai/logs/backup.log
```

### Restarting Services

```
sudo systemctl restart peerai.service
sudo systemctl restart nginx
sudo systemctl restart postgresql
```

## Troubleshooting

### Common Issues

1. **GitHub Authentication Issues**:
   - Check if your Personal Access Token is valid and has the correct permissions
   - Verify that the token has access to the repository
   - Make sure you're using the correct repository name format (without duplicated organization names)
   - Run the GitHub repository diagnosis script:
     ```
     GITHUB_USER=your_username GITHUB_REPO=peer-ai GITHUB_TOKEN=your_token ./scripts/diagnose_github_repo.sh
     ```
   - Run the GitHub authentication setup script manually:
     ```
     GITHUB_TOKEN=your_token GITHUB_USER=your_username GITHUB_REPO=peer-ai ./scripts/setup_github_auth.sh
     ```

2. **Repository Not Found Error**:
   - If you see an error like `fatal: repository 'https://github.com/username/username/repo.git/' not found`, it means there's a duplication in the repository path
   - Make sure you're using the correct repository name without any duplicated parts
   - The correct format is: `https://github.com/username/repo.git`

3. **Permission Denied Errors**:
   - If you see errors like `Permission denied` when accessing files, run the fix permissions script:
     ```
     ./scripts/fix_permissions.sh
     ```
   - This script will set the correct ownership and permissions for all files in the repository
   - For specific files, you can use: `sudo chown ubuntu:ubuntu filename && sudo chmod 644 filename`

4. **Backend service fails to start**:
   - Check logs: `sudo journalctl -u peerai.service -f`
   - Verify database connection: `psql -U peerai -d peerai_db -h localhost`
   - Check environment variables: `cat /home/ubuntu/peer-ai/backend/.env`

5. **Frontend not loading**:
   - Check Nginx configuration: `sudo nginx -t`
   - Verify build files exist: `ls -la /home/ubuntu/peer-ai/frontend/admin-dashboard/dist`
   - Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

6. **Database connection issues**:
   - Check PostgreSQL status: `sudo systemctl status postgresql`
   - Verify database exists: `sudo -u postgres psql -c "\l"`
   - Check user permissions: `sudo -u postgres psql -c "\du"`

### Deployment Verification

Run the deployment check script to verify all components are running correctly:

```
cd /home/ubuntu/peer-ai
./scripts/check_deployment.sh
```

## Accessing the Application

- Frontend: http://158.174.210.91
- Backend API: http://158.174.210.91/api
- Health check: http://158.174.210.91/health 

## Unified Server Deployment

The application can now be deployed as a unified server which combines the backend API, frontend, and connects to a PostgreSQL database.

### Prerequisites

- Ubuntu server (tested with Ubuntu 20.04 LTS)
- Root access or sudo privileges
- Git (optional)

### Deployment Options

#### Option 1: Automatic Deployment

1. Clone the repository (if not already done):
   ```bash
   git clone https://github.com/yourusername/peer-ai.git
   cd peer-ai
   ```

2. Run the deployment script with sudo:
   ```bash
   sudo ./deployment/deploy_unified.sh
   ```

   This script will:
   - Install and configure PostgreSQL if not already running
   - Create the necessary database and user
   - Install the systemd service
   - Start the service

#### Option 2: Manual Deployment

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/peer-ai.git
   cd peer-ai
   ```

2. Set up PostgreSQL:
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl enable postgresql
   sudo systemctl start postgresql
   
   # Create database and user
   sudo -u postgres psql -c "CREATE USER peerai WITH PASSWORD 'peerai_password';"
   sudo -u postgres psql -c "CREATE DATABASE peerai_db OWNER peerai;"
   ```

3. Install the systemd service:
   ```bash
   sudo cp deployment/peerai-unified.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable peerai-unified
   sudo systemctl start peerai-unified
   ```

4. (Optional) Configure Nginx as a reverse proxy:
   ```bash
   sudo apt install nginx
   sudo cp deployment/nginx-unified.conf /etc/nginx/sites-available/peerai
   sudo ln -s /etc/nginx/sites-available/peerai /etc/nginx/sites-enabled/
   sudo systemctl restart nginx
   ```

### Configuration

The unified server uses the following configuration files:

- `.env` - Main environment variables
- `backend/.env` - Backend-specific environment variables
- `frontend/admin-dashboard/.env` - Frontend-specific environment variables

Make sure to update these files with the correct settings for your environment. 