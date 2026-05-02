#!/usr/bin/env bash
# =============================================================
# IONOS VPS2 Initial Setup — Staging Server — Ubuntu 24.04
# IP: 74.208.142.42
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
sudo -u postgres psql -c "ALTER USER adel WITH PASSWORD '!??!A@10530501b1515D';"
echo "PostgreSQL database 'adel_resort' created for user 'adel'"

echo "=== 9. Add swap space (2GB) ==="
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap space created"
else
    echo "Swap already exists"
fi

echo ""
echo "============================================="
echo "  Setup complete for VPS2 staging!"
echo "  Next: su - adel, then clone repo & deploy"
echo "============================================="