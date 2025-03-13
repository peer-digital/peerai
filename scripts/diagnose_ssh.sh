#!/bin/bash
set -e

echo "=== SSH Diagnostic Tool ==="
echo "Running on: $(hostname)"
echo "Date: $(date)"
echo "User: $(whoami)"
echo ""

# Check SSH service status
echo "=== SSH Service Status ==="
sudo systemctl status ssh | grep -E "Active:|running" || echo "SSH service not running properly"
echo ""

# Check SSH configuration
echo "=== SSH Server Configuration ==="
grep -v "^#" /etc/ssh/sshd_config | grep -v "^$" || echo "Could not read SSH config"
echo ""

# Check authorized keys
echo "=== Authorized Keys ==="
if [ -f ~/.ssh/authorized_keys ]; then
  echo "Authorized keys file exists"
  ls -la ~/.ssh/authorized_keys
  echo "Number of keys: $(grep -c "ssh-" ~/.ssh/authorized_keys)"
  # Print key types without showing the full keys
  grep "ssh-" ~/.ssh/authorized_keys | awk '{print $1}' || echo "No keys found"
else
  echo "No authorized_keys file found"
fi
echo ""

# Check SSH logs
echo "=== Recent SSH Logs ==="
sudo grep "sshd" /var/log/auth.log | tail -n 20 || echo "Could not read SSH logs"
echo ""

# Check supported key algorithms
echo "=== Supported Key Algorithms ==="
ssh -Q key || echo "Could not determine supported key algorithms"
echo ""

echo "=== SSH Diagnostic Complete ===" 