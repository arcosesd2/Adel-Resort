#!/usr/bin/env bash
# =============================================================
# Deploy / Redeploy Script — run as user 'adel'
# Usage: bash deploy.sh
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

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

pip install -r requirements.txt --quiet
python manage.py collectstatic --no-input
python manage.py migrate --no-input

# Load fixtures only on first deploy
if [ ! -f "$APP_DIR/.fixtures_loaded" ]; then
    python manage.py loaddata fixtures/rooms.json
    python manage.py loaddata fixtures/pricing.json
    touch "$APP_DIR/.fixtures_loaded"
    echo "Fixtures loaded (first deploy)"
fi

deactivate

echo "=== 3. Frontend setup ==="
cd "$FRONTEND_DIR"
npm ci
npm run build

echo "=== 4. Restart services ==="
sudo supervisorctl restart gunicorn
pm2 restart adel-frontend || pm2 start /home/adel/adel-beach-resort/deploy/pm2/ecosystem.config.js

echo ""
echo "=== Deploy complete! ==="
echo "Backend:  http://api.adel-resort.ph"
echo "Frontend: http://adel-resort.ph"
