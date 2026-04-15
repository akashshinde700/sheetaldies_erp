#!/bin/bash
# ============================================================
# SHEETAL DIES ERP — Complete One-Shot Deployment
# Run from Git Bash in project folder: bash DEPLOY-NOW.sh
# ============================================================
set -e

SERVER="root@72.61.248.205"
SSH_KEY="$HOME/.ssh/sheetal_key"
SERVER_PATH="/root/sheetaldies"
DB_NAME="sheetal_dies_erp"
DB_APP_USER="sheetalerp"
DB_APP_PASS="Sh33t@lDB#2026"
LOCAL_DB_USER="root"
LOCAL_DB_PASS="root"
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Color helpers ──────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
step() { echo -e "\n${BLUE}=== $1 ===${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ── SSH helpers using key (no password needed) ────────────
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=30"

step "Testing server connection"
ssh $SSH_OPTS $SERVER "echo ok" || { echo -e "${RED}Cannot connect. Run: ssh-copy-id -i ~/.ssh/sheetal_key.pub root@72.61.248.205${NC}"; exit 1; }
ok "Connected to $SERVER"

ssh_run() { ssh $SSH_OPTS $SERVER "$@"; }
scp_up()  { scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$@"; }

# ══════════════════════════════════════════════════════════
# PHASE 1: Server Package Setup
# ══════════════════════════════════════════════════════════
step "Phase 1: Setting up server packages"

ssh_run bash << 'REMOTE_SETUP'
set -e
export DEBIAN_FRONTEND=noninteractive

echo "--- Node.js 20 ---"
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "--- Nginx ---"
if ! command -v nginx &>/dev/null; then
  apt-get install -y nginx
  systemctl enable nginx
  systemctl start nginx
fi

echo "--- PM2 ---"
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
  pm2 startup systemd -u root --hp /root | tail -1 | bash || true
fi

echo "--- Certbot ---"
if ! command -v certbot &>/dev/null; then
  apt-get install -y certbot python3-certbot-nginx
fi

echo "--- Directories ---"
mkdir -p /root/sheetaldies/backend/uploads
mkdir -p /root/sheetaldies/backend/logs
mkdir -p /root/sheetaldies/frontend/dist

echo "Server packages ready."
REMOTE_SETUP
ok "Server packages installed"

# ══════════════════════════════════════════════════════════
# PHASE 2: MySQL User + Database Setup
# ══════════════════════════════════════════════════════════
step "Phase 2: MySQL setup"

ssh_run bash << REMOTE_MYSQL
set -e
mysql -u root << 'SQL'
ALTER DATABASE sheetal_dies_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'sheetalerp'@'localhost' IDENTIFIED BY 'Sh33t@lDB#2026';
GRANT ALL PRIVILEGES ON sheetal_dies_erp.* TO 'sheetalerp'@'localhost';
FLUSH PRIVILEGES;
SQL
echo "MySQL user created."
REMOTE_MYSQL
ok "MySQL user 'sheetalerp' configured"

# ══════════════════════════════════════════════════════════
# PHASE 3: Export local DB and upload
# ══════════════════════════════════════════════════════════
step "Phase 3: Exporting local database"

cd "$PROJECT_ROOT"
DUMP_FILE="$PROJECT_ROOT/sheetal_dump.sql"

if command -v mysqldump &>/dev/null; then
  if [ -z "$LOCAL_DB_PASS" ]; then
    mysqldump -u "$LOCAL_DB_USER" "$DB_NAME" > "$DUMP_FILE" 2>/dev/null \
      || mysqldump -u "$LOCAL_DB_USER" -p"$LOCAL_DB_PASS" "$DB_NAME" > "$DUMP_FILE"
  else
    mysqldump -u "$LOCAL_DB_USER" -p"$LOCAL_DB_PASS" "$DB_NAME" > "$DUMP_FILE" 2>/dev/null \
      || { warn "DB dump failed with password, trying without..."; mysqldump -u "$LOCAL_DB_USER" "$DB_NAME" > "$DUMP_FILE"; }
  fi
  DUMP_SIZE=$(wc -c < "$DUMP_FILE")
  ok "Database exported: ${DUMP_SIZE} bytes"

  step "Uploading database dump to server"
  scp_up "$DUMP_FILE" "$SERVER:/root/sheetal_dump.sql"
  ok "Dump uploaded"

  step "Importing database on server"
  ssh_run "mysql -u root $DB_NAME < /root/sheetal_dump.sql && echo 'Import OK' && rm /root/sheetal_dump.sql"
  ok "Database imported"
  rm -f "$DUMP_FILE"
else
  warn "mysqldump not found locally — skipping DB import (will run Prisma migrations only)"
fi

# ══════════════════════════════════════════════════════════
# PHASE 4: Build Frontend
# ══════════════════════════════════════════════════════════
step "Phase 4: Building frontend"

cd "$PROJECT_ROOT/frontend"
if [ ! -d node_modules ]; then
  npm install
fi
npm run build
ok "Frontend built → frontend/dist/"

# ══════════════════════════════════════════════════════════
# PHASE 5: Sync files to server
# ══════════════════════════════════════════════════════════
step "Phase 5: Uploading backend to server (tar + scp)"

cd "$PROJECT_ROOT"

# Pack backend (exclude node_modules, .env, logs, uploads)
tar --exclude='./backend/node_modules' \
    --exclude='./backend/.env' \
    --exclude='./backend/.env.production' \
    --exclude='./backend/logs' \
    --exclude='./backend/uploads' \
    -czf /tmp/sheetal_backend.tar.gz -C "$PROJECT_ROOT" backend
scp_up /tmp/sheetal_backend.tar.gz "$SERVER:/tmp/sheetal_backend.tar.gz"
ssh_run "tar -xzf /tmp/sheetal_backend.tar.gz -C $SERVER_PATH --strip-components=1 && rm /tmp/sheetal_backend.tar.gz"
rm -f /tmp/sheetal_backend.tar.gz
ok "Backend uploaded"

step "Uploading frontend build"
tar -czf /tmp/sheetal_frontend.tar.gz -C "$PROJECT_ROOT/frontend" dist
scp_up /tmp/sheetal_frontend.tar.gz "$SERVER:/tmp/sheetal_frontend.tar.gz"
ssh_run "tar -xzf /tmp/sheetal_frontend.tar.gz -C $SERVER_PATH/frontend && rm /tmp/sheetal_frontend.tar.gz"
rm -f /tmp/sheetal_frontend.tar.gz
ok "Frontend build uploaded"

# ══════════════════════════════════════════════════════════
# PHASE 6: Production .env on server
# ══════════════════════════════════════════════════════════
step "Phase 6: Writing production .env on server"

ssh_run bash << 'REMOTE_ENV'
cat > /root/sheetaldies/backend/.env << 'ENVEOF'
NODE_ENV=production
PORT=5000
DATABASE_URL="mysql://sheetalerp:Sh33t@lDB#2026@localhost:3306/sheetal_dies_erp"
JWT_SECRET=a78bea344f06987f9a8c83891c0169ecda416132aac21bb5d45cf1d9d6a0adb0bbee923463d84d4f406b9d1310f031c92640851929d5599f0fa295691985c1ca
JWT_REFRESH_SECRET=9051cea0db564519b8bf92c9301f703680868c09acdb41bf882d349b4061daa4b1cc72dcdd62e5ab1482568a9b9a13a513e59d946b25a0cfd953fd44edbfae34
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d
ENCRYPTION_KEY=d2a470533abbc18c3642dba4d1ae7fcdca73f89f2be92710a67813cfb5f3f7b5
FRONTEND_URL=https://codeprana.com
CORS_ORIGINS=https://codeprana.com,https://www.codeprana.com
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
ADMIN_EMAIL=admin@sheetaldies.com
ADMIN_PASSWORD=Sh33t@lD!es#2026$Secure
ADMIN_NAME=Administrator
RATE_LIMIT_GENERAL=100
RATE_LIMIT_STRICT=20
RATE_LIMIT_UPLOADS=10
ENVEOF
echo ".env written"
REMOTE_ENV
ok ".env configured"

# ══════════════════════════════════════════════════════════
# PHASE 7: Install deps + Prisma migrate
# ══════════════════════════════════════════════════════════
step "Phase 7: Installing backend dependencies + running migrations"

ssh_run bash << 'REMOTE_DEPS'
set -e
cd /root/sheetaldies/backend
npm install --omit=dev
npx prisma generate
npx prisma migrate deploy
echo "Dependencies and migrations done."
REMOTE_DEPS
ok "Backend ready"

# ══════════════════════════════════════════════════════════
# PHASE 8: Nginx config
# ══════════════════════════════════════════════════════════
step "Phase 8: Configuring Nginx"

ssh_run bash << 'REMOTE_NGINX'
cat > /etc/nginx/sites-available/codeprana.conf << 'NGINXEOF'
server {
    listen 80;
    server_name codeprana.com www.codeprana.com;

    root /root/sheetaldies/frontend/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        client_max_body_size 50M;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/codeprana.conf /etc/nginx/sites-enabled/codeprana.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "Nginx configured."
REMOTE_NGINX
ok "Nginx configured"

# ══════════════════════════════════════════════════════════
# PHASE 9: Start backend with PM2
# ══════════════════════════════════════════════════════════
step "Phase 9: Starting backend with PM2"

ssh_run bash << 'REMOTE_PM2'
set -e
cd /root/sheetaldies/backend
pm2 delete sheetal-erp-backend 2>/dev/null || true
pm2 start src/app.js \
  --name sheetal-erp-backend \
  --max-memory-restart 500M \
  --log /root/sheetaldies/backend/logs/pm2-out.log \
  --error /root/sheetaldies/backend/logs/pm2-error.log
pm2 save
sleep 3
pm2 status
REMOTE_PM2
ok "Backend running with PM2"

# ══════════════════════════════════════════════════════════
# PHASE 10: SSL with Certbot
# ══════════════════════════════════════════════════════════
step "Phase 10: Setting up HTTPS (SSL)"

ssh_run bash << 'REMOTE_SSL'
certbot --nginx -d codeprana.com -d www.codeprana.com \
  --non-interactive --agree-tos --email admin@sheetaldies.com \
  --redirect 2>&1 || echo "SSL setup may need manual run: certbot --nginx -d codeprana.com -d www.codeprana.com"
REMOTE_SSL

# ══════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        DEPLOYMENT COMPLETE!                      ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Site:     https://codeprana.com                 ║${NC}"
echo -e "${GREEN}║  Login:    admin@sheetaldies.com                 ║${NC}"
echo -e "${GREEN}║  Password: Sh33t@lD!es#2026\$Secure               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
