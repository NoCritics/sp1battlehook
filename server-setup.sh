#!/bin/bash

# Update system packages
apt update && apt upgrade -y

# Install nginx if not already installed
apt install -y nginx

# Create directory for the game
mkdir -p /var/www/html/sp1game

# Set permissions
chown -R www-data:www-data /var/www/html/sp1game
chmod -R 755 /var/www/html/sp1game

# Create nginx site configuration
cat > /etc/nginx/sites-available/sp1game.conf << 'EOL'
server {
    listen 80;
    server_name 193.233.253.236;

    root /var/www/html/sp1game;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Enable caching for static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";
}
EOL

# Enable the site
ln -sf /etc/nginx/sites-available/sp1game.conf /etc/nginx/sites-enabled/

# Configure SSH for deployment
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# You'll need to add the public key to authorized_keys manually
echo "Don't forget to add the public key to ~/.ssh/authorized_keys!"

# Test nginx config and restart
nginx -t && systemctl restart nginx

echo "Server setup complete! Deploy your game using GitHub Actions." 