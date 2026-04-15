#!/bin/bash
# ============================================================
# SHEETAL DIES ERP — Deploy from Local to VPS
# Run from Git Bash on Windows from the project root folder
# Usage: bash deploy-to-vps.sh
# ============================================================
set -e

SERVER="root@72.61.248.205"
SERVER_PATH="/root/sheetaldies"
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== [1/5] Building frontend ==="
cd "$PROJECT_ROOT/frontend"
npm run build
cd "$PROJECT_ROOT"

echo "=== [2/5] Syncing backend to server ==="
rsync -avz --progress \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='logs' \
  --exclude='uploads' \
  "$PROJECT_ROOT/backend/" "$SERVER:$SERVER_PATH/backend/"

echo "=== [3/5] Syncing frontend build to server ==="
rsync -avz --progress \
  "$PROJECT_ROOT/frontend/dist/" "$SERVER:$SERVER_PATH/frontend/dist/"

echo "=== [4/5] Syncing Nginx config ==="
rsync -avz "$PROJECT_ROOT/nginx-codeprana.conf" \
  "$SERVER:/etc/nginx/sites-available/codeprana.conf"

echo "=== [5/5] Running remote deployment ==="
ssh "$SERVER" bash << 'REMOTE'
set -e
SERVER_PATH="/root/sheetaldies"
cd "$SERVER_PATH/backend"

echo "--- Installing backend dependencies ---"
npm install --omit=dev

echo "--- Checking .env ---"
if [ ! -f .env ]; then
  echo "ERROR: .env not found at $SERVER_PATH/backend/.env"
  echo "Copy backend/.env.production from your project to the server as .env"
  exit 1
fi

echo "--- Running Prisma migrations ---"
npx prisma generate
npx prisma migrate deploy

echo "--- Enabling Nginx site ---"
ln -sf /etc/nginx/sites-available/codeprana.conf /etc/nginx/sites-enabled/codeprana.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "--- Starting/restarting backend with PM2 ---"
pm2 delete sheetal-erp-backend 2>/dev/null || true
pm2 start src/app.js --name sheetal-erp-backend --env production
pm2 save

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
pm2 status
echo ""
echo "Site: http://codeprana.com"
echo "To enable HTTPS: ssh root@72.61.248.205 then run:"
echo "  certbot --nginx -d codeprana.com -d www.codeprana.com"
REMOTE

echo ""
echo "=== Done! Visit http://codeprana.com ==="
