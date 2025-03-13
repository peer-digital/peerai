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
   - `GITHUB_PAT`: The Personal Access Token you created in the previous step

## Deployment Methods

### Method 1: GitHub Actions (Recommended)

1. Go to the Actions tab in your GitHub repository
2. Select the "Manual Deployment" workflow
3. Click "Run workflow"
4. Select "production" as the environment
5. Click "Run workflow"

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

5. **Run the deployment script**:
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

### Restore

To restore from a backup:

```
cd /home/ubuntu/peer-ai
./scripts/restore_db.sh
```

By default, this will restore from the latest backup. To restore from a specific backup, edit the script and update the `BACKUP_FILE` variable.

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
   - Run the GitHub authentication setup script manually:
     ```
     GITHUB_TOKEN=your_token GITHUB_USER=your_username GITHUB_REPO=peer-ai ./scripts/setup_github_auth.sh
     ```

2. **Backend service fails to start**:
   - Check logs: `sudo journalctl -u peerai.service -f`
   - Verify database connection: `psql -U peerai -d peerai_db -h localhost`
   - Check environment variables: `cat /home/ubuntu/peer-ai/backend/.env`

3. **Frontend not loading**:
   - Check Nginx configuration: `sudo nginx -t`
   - Verify build files exist: `ls -la /home/ubuntu/peer-ai/frontend/admin-dashboard/dist`
   - Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

4. **Database connection issues**:
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