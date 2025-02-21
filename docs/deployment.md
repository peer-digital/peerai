# PeerAI Deployment Guide

This guide covers deploying PeerAI to Bahnhof's cloud infrastructure while ensuring all data remains within Sweden.

## Prerequisites

- Bahnhof VM with Ubuntu 22.04 LTS
- PostgreSQL 15+ database instance
- Python 3.11+
- Nginx for reverse proxy
- SSL certificates

## System Setup

1. **Create Service User**
```bash
sudo useradd -m -s /bin/bash peerai
sudo usermod -aG sudo peerai
```

2. **Install Dependencies**
```bash
sudo apt update
sudo apt install -y python3.11 python3.11-venv postgresql-client nginx

# Install Python build dependencies
sudo apt install -y build-essential libpq-dev python3.11-dev
```

3. **Configure PostgreSQL**
```bash
# Connect to PostgreSQL and create database/user
sudo -u postgres psql

CREATE DATABASE peerai;
CREATE USER peerai WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE peerai TO peerai;
\q
```

## Application Setup

1. **Clone Repository**
```bash
sudo mkdir /opt/peerai
sudo chown peerai:peerai /opt/peerai
cd /opt/peerai
git clone https://github.com/peerdigital/peerai.git .
```

2. **Create Virtual Environment**
```bash
python3.11 -m venv venv
source venv/bin/activate
pip install -e ".[dev]"
```

3. **Configure Environment**
```bash
# Copy example env file
cp .env.example .env

# Edit with production values
nano .env
```

4. **Initialize Database**
```bash
# Run migrations
alembic upgrade head

# Create initial superuser
python scripts/create_superuser.py
```

## Service Configuration

1. **Install Systemd Service**
```bash
# Copy service file
sudo cp deployment/bahnhof.service /etc/systemd/system/peerai.service

# Edit with production values
sudo nano /etc/systemd/system/peerai.service

# Start service
sudo systemctl daemon-reload
sudo systemctl enable peerai
sudo systemctl start peerai
```

2. **Configure Nginx**
```bash
# Copy nginx config
sudo cp deployment/nginx.conf /etc/nginx/sites-available/peerai

# Edit with your domain
sudo nano /etc/nginx/sites-available/peerai

# Enable site
sudo ln -s /etc/nginx/sites-available/peerai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

3. **SSL Configuration**
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.peerdigital.se
```

## Monitoring & Maintenance

1. **View Logs**
```bash
# Application logs
sudo journalctl -u peerai -f

# Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

2. **Backup Database**
```bash
# Daily backup script
sudo cp deployment/backup.sh /etc/cron.daily/peerai-backup
sudo chmod +x /etc/cron.daily/peerai-backup
```

3. **Update Application**
```bash
cd /opt/peerai
git pull
source venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
sudo systemctl restart peerai
```

## Security Considerations

1. **Firewall Configuration**
```bash
# Allow only necessary ports
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

2. **API Key Rotation**
- Implement regular API key rotation
- Monitor for suspicious activity
- Set appropriate rate limits

3. **Data Privacy**
- All data remains within Bahnhof's Swedish infrastructure
- Regular security audits
- GDPR compliance monitoring

## Troubleshooting

1. **Service Won't Start**
- Check logs: `sudo journalctl -u peerai -n 100`
- Verify environment variables
- Check database connectivity

2. **Database Issues**
- Verify connection string
- Check PostgreSQL logs
- Ensure migrations are up to date

3. **Performance Problems**
- Monitor resource usage
- Check connection pool settings
- Analyze slow queries

## Contact

For deployment support:
- Email: support@peerdigital.se
- Emergency: +46 XX XXX XX XX 