#!/usr/bin/env bash
# =============================================================
# IONOS VPS Initial Setup — Ubuntu 24.04
# Run as root: bash setup-server.sh
# =============================================================
set -euo pipefail

echo "=== 1. System update ==="
apt update && apt upgrade -y

echo "=== 2. Create deploy user 'adel' ==="
if ! id "adel" &>/dev/null; then
    adduser --disabled-password --gecos "" adel
    usermod -aG sudo adel
    echo "adel ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/adel
    echo "User 'adel' created with sudo access"
else
    echo "User 'adel' already exists"
fi

echo "=== 3. Install base packages ==="
apt install -y \
    git curl wget unzip \
    python3 python3-pip python3-venv \
    postgresql postgresql-contrib \
    nginx \
    supervisor \
    certbot python3-certbot-nginx \
    ufw

echo "=== 4. Install Node.js 20 ==="
if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo "Node.js $(node --version)"

echo "=== 5. Install PM2 ==="
if ! command -v pm2 &>/dev/null; then
    npm install -g pm2
fi
echo "PM2 $(pm2 --version)"

echo "=== 6. Configure UFW firewall ==="
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status

echo "=== 7. Create log directories ==="
mkdir -p /var/log/gunicorn /var/log/pm2
chown adel:adel /var/log/gunicorn /var/log/pm2

echo "=== 8. Set up PostgreSQL database ==="
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='adel'" | grep -q 1 || \
    sudo -u postgres createuser --createdb adel
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='adel_resort'" | grep -q 1 || \
    sudo -u postgres createdb -O adel adel_resort
# Set password (change this!)
sudo -u postgres psql -c "ALTER USER adel WITH PASSWORD 'CHANGE_ME_SECURE_PASSWORD';"
echo "PostgreSQL database 'adel_resort' created for user 'adel'"

echo ""
echo "============================================="
echo "  Setup complete!"
echo "  Next steps:"
echo "  1. Change the PostgreSQL password above"
echo "  2. Switch to adel user: su - adel"
echo "  3. Clone your repo and run deploy.sh"
echo "============================================="
