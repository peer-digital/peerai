# GitHub Authentication Guide for Deployment

This guide explains how to set up GitHub authentication for deploying the PeerAI application to a VM. Since GitHub requires two-factor authentication (2FA) for all users who contribute code, we need to use a Personal Access Token (PAT) for authentication.

## Creating a Personal Access Token (PAT)

1. **Go to your GitHub account settings**
   - Click on your profile picture in the top-right corner
   - Select "Settings"

2. **Navigate to Developer settings**
   - Scroll down to the bottom of the sidebar
   - Click on "Developer settings"

3. **Create a Personal Access Token**
   - Click on "Personal access tokens" > "Fine-grained tokens"
   - Click "Generate new token"

4. **Configure the token**
   - **Token name**: `PeerAI Deployment`
   - **Expiration**: Choose an appropriate expiration date (e.g., 90 days)
   - **Repository access**: Select "Only select repositories"
   - **Select repositories**: Choose your peer-ai repository
   - **Permissions**:
     - Repository permissions:
       - Contents: Read and write
       - Metadata: Read-only
       - Pull requests: Read and write (if you need CI/CD for PRs)
       - Workflows: Read and write (if you're using GitHub Actions)

5. **Generate the token**
   - Click "Generate token" at the bottom of the page
   - **IMPORTANT**: Copy the generated token immediately and store it securely. You won't be able to see it again!

## Adding the Token to GitHub Secrets

1. **Go to your GitHub repository**
   - Navigate to your peer-ai repository

2. **Access repository settings**
   - Click on "Settings" tab

3. **Add the secret**
   - In the left sidebar, click on "Secrets and variables" > "Actions"
   - Click "New repository secret"
   - **Name**: `GH_PAT`
   - **Value**: Paste the Personal Access Token you created
   - Click "Add secret"

4. **Add SSH private key**
   - Click "New repository secret" again
   - **Name**: `SSH_PRIVATE_KEY`
   - **Value**: Paste the contents of the `PrivateKey.rsa` file
   - Click "Add secret"

## Understanding GitHub Repository Formats

When working with GitHub repositories, it's important to use the correct repository format to avoid errors.

### Correct Repository Format

The correct format for a GitHub repository URL is:

```
https://github.com/username/repository.git
```

Where:
- `username` is your GitHub username or organization name (e.g., `peer-digital`)
- `repository` is the name of your repository (e.g., `peer-ai`)

### Common Mistakes

1. **Duplicated username/organization**:
   ```
   https://github.com/username/username/repository.git
   ```
   This is incorrect and will result in a "repository not found" error.

2. **Including subdirectories in the repository name**:
   ```
   https://github.com/username/repository/subdirectory.git
   ```
   This is incorrect. Subdirectories should be navigated after cloning.

3. **Missing or extra slashes**:
   ```
   https://github.com/username//repository.git
   ```
   Extra or missing slashes can cause errors.

### Diagnosing Repository Issues

You can use the `diagnose_github_repo.sh` script to check if your repository exists and is accessible:

```bash
GITHUB_USER=your_username GITHUB_REPO=repository_name GITHUB_TOKEN=your_token ./scripts/diagnose_github_repo.sh
```

This script will:
1. Clean up the repository name
2. Check if the repository exists
3. Test different URL formats
4. List available repositories if the specified one is not found

## Setting Up GitHub Authentication on the VM

### Method 1: Using GitHub Actions (Recommended)

The GitHub Actions workflow will automatically set up GitHub authentication on the VM using the Personal Access Token you added to the repository secrets.

1. **Trigger the deployment workflow**
   - Go to the Actions tab in your GitHub repository
   - Select the "Manual Deployment" workflow
   - Click "Run workflow"
   - Select "production" as the environment
   - Click "Run workflow"

### Method 2: Manual Setup

If you need to set up GitHub authentication manually:

1. **Run the manual GitHub setup script locally**
   ```bash
   GITHUB_TOKEN=your_token GITHUB_USER=your_username GITHUB_REPO=peer-ai ./scripts/manual_github_setup.sh
   ```

2. **Verify the authentication**
   ```bash
   # SSH into the VM
   ssh ubuntu@app.peerdigital.se

   # Test the authentication
   GITHUB_USER=your_username GITHUB_REPO=peer-ai ./scripts/test_github_auth.sh
   ```

## Troubleshooting GitHub Authentication Issues

### Common Issues

1. **Authentication failure when cloning the repository**
   - Verify that your Personal Access Token is valid and has not expired
   - Check that the token has the correct permissions (at least "Contents: Read and write")
   - Ensure the token has access to the repository

2. **"fatal: could not read Username for 'https://github.com': No such device or address"**
   - This error indicates that Git is trying to prompt for credentials but can't because it's running in a non-interactive environment
   - Run the GitHub authentication setup script to configure Git to use the token:
     ```bash
     GITHUB_TOKEN=your_token GITHUB_USER=your_username GITHUB_REPO=peer-ai ./scripts/setup_github_auth.sh
     ```

3. **"fatal: repository 'https://github.com/username/username/repo.git/' not found"**
   - This error indicates a duplicated username in the repository path
   - Make sure you're using the correct repository name format: `https://github.com/username/repo.git`
   - Run the diagnosis script to verify the repository exists and is accessible:
     ```bash
     GITHUB_USER=your_username GITHUB_REPO=peer-ai GITHUB_TOKEN=your_token ./scripts/diagnose_github_repo.sh
     ```

### Testing GitHub Authentication

You can test if your GitHub authentication is working correctly by running:

```bash
GITHUB_USER=your_username GITHUB_REPO=peer-ai ./scripts/test_github_auth.sh
```

This script will attempt to clone the repository to a temporary directory. If successful, it will display a success message and clean up the temporary directory.

## Security Considerations

- **Never commit your Personal Access Token to the repository**
- Store the token securely and only share it through secure channels
- Set an expiration date for your token to limit the security risk
- Use the minimum required permissions for your token
- Regularly rotate your tokens, especially if you suspect they may have been compromised