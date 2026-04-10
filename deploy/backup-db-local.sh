#!/usr/bin/env bash
# =============================================================
# Local database backup (no email) — runs via cron as user 'adel'
# - Creates compressed PostgreSQL backup to local disk only
# - Prunes local backups older than 7 days
# Cron: */30 * * * * /home/adel/adel-beach-resort/deploy/backup-db-local.sh
# =============================================================
set -euo pipefail

BACKUP_DIR="/home/adel/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/adel_resort_${TIMESTAMP}_local.sql.gz"
LOG_FILE="/var/log/backup-local.log"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting local backup..." >> "$LOG_FILE"

pg_dump adel_resort | gzip > "$BACKUP_FILE"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Local backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))" >> "$LOG_FILE"

# Keep only last 7 days of local backups
find "$BACKUP_DIR" -name "adel_resort_*_local.sql.gz" -mtime +7 -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Old local backups pruned" >> "$LOG_FILE"