#!/usr/bin/env bash
# =============================================================
# Sync DB from vps1 (production) to vps2 (staging)
# Run on vps2 as user 'adel'
# Usage: bash sync-db-from-prod.sh
# =============================================================
set -euo pipefail

PROD_IP="74.208.142.44"
DB_NAME="adel_resort"
BACKUP_DIR="/home/adel/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Dumping production DB from vps1..."
ssh adel@"$PROD_IP" "pg_dump $DB_NAME" | gzip > "$BACKUP_DIR/prod_sync_${TIMESTAMP}.sql.gz"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restoring to staging DB..."
# Drop and recreate to avoid conflicts
dropdb --if-exists "$DB_NAME"
createdb -O adel "$DB_NAME"
gunzip -c "$BACKUP_DIR/prod_sync_${TIMESTAMP}.sql.gz" | psql "$DB_NAME" >/dev/null

echo "[$(date '+%Y-%m-%d %H:%M:%S')] DB sync complete!"

# Prune old sync backups (keep last 5)
ls -t "$BACKUP_DIR"/prod_sync_*.sql.gz | tail -n +6 | xargs -r rm
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Old sync backups pruned"