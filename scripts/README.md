# VM Connection and Database Testing Scripts

This directory contains scripts to help you connect to the VM and test the database.

## Scripts Overview

- `connect_to_vm.sh`: Sets up SSH keys and connects to the VM
- `ssh_to_db.sh`: Connects to the VM and runs database tests
- `diagnose_ssh_locally.sh`: Diagnoses SSH connection issues
- `setup_local_ssh.sh`: Sets up SSH keys for connecting to the VM

## Connecting to the VM

To connect to the VM, run:

```bash
./scripts/connect_to_vm.sh
```

This script will:
1. Create a temporary SSH key file at `~/.ssh/peer_ai_vm_key`
2. Update your SSH known_hosts file to accept the VM's host key
3. Provide you with the command to connect to the VM
4. Optionally connect you to the VM immediately

## Testing the Database

To test the database, run:

```bash
./scripts/ssh_to_db.sh
```

This script will:
1. Check if you're already on the VM
2. If not, it will use the `connect_to_vm.sh` script to connect to the VM
3. Run database tests to check the connection, tables, and constraints
4. Connect you to the PostgreSQL shell

## Troubleshooting SSH Connection Issues

If you're having trouble connecting to the VM, run:

```bash
./scripts/diagnose_ssh_locally.sh
```

This script will:
1. Check your SSH directory permissions
2. Check your SSH key permissions
3. Display your SSH key fingerprint
4. Check if the SSH agent is running
5. Test the SSH connection with verbose output
6. Provide next steps if the connection fails

## GitHub Actions Workflow

The GitHub Actions workflow (`.github/workflows/deploy.yml`) has been updated to handle host key changes by using the `use_insecure_cipher: true` parameter for all SSH and SCP actions.

## Manual SSH Connection

If you prefer to connect to the VM manually, you can use:

```bash
ssh -i ~/.ssh/peer_ai_vm_key -o IdentitiesOnly=yes -o StrictHostKeyChecking=no ubuntu@158.174.210.91
```

## Database Connection Details

- Host: localhost
- Port: 5432
- Database: peerai_db
- Username: peerai
- Password: peerai_password 