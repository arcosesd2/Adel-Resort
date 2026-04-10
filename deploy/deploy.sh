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

echo "=== 5. Ensure cron jobs ==="
CRON_CMD="*/5 * * * * $BACKEND_DIR/venv/bin/python $BACKEND_DIR/manage.py run_all_crons >> /var/log/cron-tasks.log 2>&1"
(crontab -l 2>/dev/null | grep -v "run_all_crons"; echo "$CRON_CMD") | crontab -
echo "Cron job installed: run_all_crons every 5 minutes"

BACKUP_CRON="0 2 * * * /home/adel/adel-beach-resort/deploy/backup-db.sh"
(crontab -l 2>/dev/null | grep -v "backup-db.sh"; echo "$BACKUP_CRON") | crontab -
echo "Cron job installed: backup-db daily at 2 AM"

LOCAL_BACKUP_CRON="*/30 * * * * /home/adel/adel-beach-resort/deploy/backup-db-local.sh"
(crontab -l 2>/dev/null | grep -v "backup-db-local.sh"; echo "$LOCAL_BACKUP_CRON") | crontab -
echo "Cron job installed: backup-db-local every 30 minutes"

echo ""
echo "=== Deploy complete! ==="
echo "Backend:  http://api.adel-resort.ph"
echo "Frontend: http://adel-resort.ph"
