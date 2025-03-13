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

## Deployment Methods

### Method 1: GitHub Actions (Recommended)

1. **Set up SSH key in GitHub**:
   - Go to your GitHub repository
   - Navigate to Settings > Secrets and variables > Actions
   - Create a new repository secret named `SSH_PRIVATE_KEY`
   - Paste the contents of the `PrivateKey.rsa` file

2. **Trigger the deployment**:
   - Go to the Actions tab in your GitHub repository
   - Select the "Manual Deployment" workflow
   - Click "Run workflow"
   - Select "production" as the environment
   - Click "Run workflow"

### Method 2: Manual Deployment

1. **SSH into the VM**:
   ```
   ssh ubuntu@158.174.210.91
   ```

2. **Clone the repository**:
   ```
   git clone https://github.com/your-org/peer-ai.git
   cd peer-ai
   ```

3. **Run the setup script**:
   ```
   chmod +x scripts/setup_vm.sh
   ./scripts/setup_vm.sh
   ```

4. **Set up SSH keys**:
   ```
   chmod +x scripts/setup_ssh.sh
   ./scripts/setup_ssh.sh
   ```

5. **Run the deployment script**:
   ```
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

1. **Backend service fails to start**:
   - Check logs: `sudo journalctl -u peerai.service -f`
   - Verify database connection: `psql -U peerai -d peerai_db -h localhost`
   - Check environment variables: `cat /home/ubuntu/peer-ai/backend/.env`

2. **Frontend not loading**:
   - Check Nginx configuration: `sudo nginx -t`
   - Verify build files exist: `ls -la /home/ubuntu/peer-ai/frontend/admin-dashboard/dist`
   - Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

3. **Database connection issues**:
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