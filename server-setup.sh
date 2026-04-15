#!/bin/bash
# ============================================================
# SHEETAL DIES ERP — VPS One-Time Server Setup
# Run this on the VPS as root: bash server-setup.sh
# ============================================================
set -e

echo "=== [1/6] Installing Node.js 20 LTS ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v && npm -v

echo "=== [2/6] Installing MySQL 8 ==="
apt-get install -y mysql-server
systemctl enable mysql
systemctl start mysql

echo "=== [3/6] Setting up MySQL database ==="
DB_PASS="Sh33t@lDB#2026"
mysql -e "CREATE DATABASE IF NOT EXISTS sheetal_dies_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'sheetalerp'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON sheetal_dies_erp.* TO 'sheetalerp'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"
echo "DB password: ${DB_PASS}"

echo "=== [4/6] Installing Nginx ==="
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx

echo "=== [5/6] Installing PM2 and Certbot ==="
npm install -g pm2
pm2 startup systemd -u root --hp /root
apt-get install -y certbot python3-certbot-nginx

echo "=== [6/6] Creating directory structure ==="
mkdir -p /root/sheetaldies/backend/uploads
mkdir -p /root/sheetaldies/backend/logs
mkdir -p /root/sheetaldies/frontend/dist

echo ""
echo "=== SERVER SETUP COMPLETE ==="
echo "MySQL DB:   sheetal_dies_erp"
echo "MySQL User: sheetalerp"
echo "MySQL Pass: ${DB_PASS}"
echo ""
echo "Next: run deploy-to-vps.sh from your local machine"
