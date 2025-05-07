# Deployment Instructions

This document contains instructions for setting up automatic deployment from GitHub to your Ubuntu server.

## Server Setup

1. SSH into your Ubuntu server:
   ```
   ssh root@193.233.253.236
   ```

2. Upload the `server-setup.sh` script to your server:
   ```
   scp server-setup.sh root@193.233.253.236:~/
   ```

3. Make the script executable and run it:
   ```
   chmod +x server-setup.sh
   ./server-setup.sh
   ```

4. Add the public key to authorized_keys file:
   ```
   echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQChOJ9cI+K4IBJ2lLiFpwTiuEUML3BHwzdNQZXIDNPQCyhMT8OP4q8R3n+6InWle8sDk8F89fp5a27ofcTITK/w0o5mM+ndp1A/GPOsIpvvHixAYXzvvmXtAlnV0Dp9uXnODLdUHYnMzHtnGics5MgoL6uq4sEp6/8MVGPCUc24c1EjPSrXjtZr9BmLae/wtRDCJlGNSciAYcLsi3XdnWOR5QtxSvdEwT4FRwH85YUGDOCXilQYA06XAqR6fX6tKwCd8YGGNcP/jwSqNMM+4pZUfHhi/xyWVk8rR5MZ3+tTb2SFzeQodY4DeXvj6f+n+MKBXVbFkKXzhjYpBNid27//jocphDuRmRg3CAc/vii2hv4A3Zoji73UfFkRO9GD73DWnr2s3vHNwQXFk3bF4jYGMw2u4/mxJShFvlJJalDOCI9kpsJaxq3IfWJVCqZA9hNhtsxmXP2FM+mEYnH6e2BX7EXk74LC61veaqQ9DvVAzjxWLbhWfFMZLSYslNn9YxJidjzWdGXpByf6Wc2HOedB16xI8jtWr/VkEnPKLTvSkVPHROVwR21HCn9FlNFJU6burkJTk292V36IJfdeZLA6pAdfDpKxG2g2q9H6ST8eHVbe14zCFBjRUzdvB8f+kmC3ll0cVFX0Kt9cDoHfJ3H7JtJy6s5E93xxT9N9MgZq0w== vladislav@DESKTOP-6FD0AE8" >> ~/.ssh/authorized_keys
   ```

5. Set proper permissions:
   ```
   chmod 600 ~/.ssh/authorized_keys
   ```

## GitHub Repository Setup

1. Add the private key as a GitHub secret:
   - Go to your GitHub repository (https://github.com/NoCritics/sp1battlehook)
   - Navigate to Settings > Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `SSH_PRIVATE_KEY`
   - Value: Paste the entire content of your private key file (sp1game_deploy_key)
   - Click "Add secret"

2. Commit and push the GitHub workflow file:
   ```
   git add .github/workflows/deploy.yml
   git commit -m "Add deployment workflow"
   git push
   ```

## Testing the Deployment

1. Make a small change to any file in your repository
2. Commit and push the change
3. Go to the "Actions" tab in your GitHub repository to monitor the deployment
4. Once completed, visit your site at http://193.233.253.236

## Troubleshooting

- If deployment fails, check the GitHub Actions logs for errors
- Verify the SSH key is correctly added to both GitHub secrets and server
- Check server logs: `sudo tail -f /var/log/nginx/error.log` 