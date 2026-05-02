#!/usr/bin/env bash
# =============================================================
# Full Staging Deploy Script (vps2 — 74.208.142.42)
# Run as user 'adel': bash deploy-staging.sh
# =============================================================
set -euo pipefail

APP_DIR="/home/adel/adel-beach-resort"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

cd "$APP_DIR"

echo "=== 1. Pull latest code ==="
git pull origin main

echo "=== 2. Backend setup ==="
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

pip install -r requirements.txt --quiet
python manage.py collectstatic --no-input
python manage.py migrate --no-input

deactivate

echo "=== 3. Frontend setup ==="
cd "$FRONTEND_DIR"
npm ci
npm run build

echo "=== 4. Restart services ==="
sudo supervisorctl restart gunicorn
pm2 restart adel-frontend || pm2 start /home/adel/adel-beach-resort/deploy/pm2/ecosystem.config.js

echo ""
echo "=== Staging deploy complete! ==="
echo "Backend:  http://staging-api.adel-resort.ph"
echo "Frontend: http://staging.adel-resort.ph"