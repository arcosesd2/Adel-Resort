#!/usr/bin/env bash
# =============================================================
# Database backup script — runs via cron as user 'adel'
# Cron: 0 2 * * * /home/adel/adel-beach-resort/deploy/backup-db.sh
# =============================================================
set -euo pipefail

BACKUP_DIR="/home/adel/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/adel_resort_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

pg_dump adel_resort | gzip > "$BACKUP_FILE"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "adel_resort_*.sql.gz" -mtime +30 -delete

echo "Backup created: $BACKUP_FILE"
