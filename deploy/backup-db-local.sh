#!/usr/bin/env bash
# =============================================================
# Frequent database backup (every 30 min) — runs via cron as user 'adel'
# - Creates compressed PostgreSQL backup to local disk
# - Uploads to Google Drive (rclone remote 'gdrive', folder 'frequent/')
# - Prunes local backups older than 7 days; Drive 'frequent/' older than 24h
# Cron: */30 * * * * /home/adel/adel-beach-resort/deploy/backup-db-local.sh
# =============================================================
set -euo pipefail

BACKUP_DIR="/home/adel/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/adel_resort_${TIMESTAMP}_local.sql.gz"
GDRIVE_REMOTE="gdrive:adel-resort-backups/frequent"
GDRIVE_RETENTION="24h"
LOG_FILE="/var/log/backup-local.log"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting local backup..." >> "$LOG_FILE"

pg_dump adel_resort | gzip > "$BACKUP_FILE"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Local backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))" >> "$LOG_FILE"

# Upload to Google Drive
if rclone copy "$BACKUP_FILE" "$GDRIVE_REMOTE" --log-file="$LOG_FILE" --log-level=INFO; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Uploaded to $GDRIVE_REMOTE" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Warning: Google Drive upload failed" >> "$LOG_FILE"
fi

# Prune Drive 'frequent/' backups older than retention window
rclone delete "$GDRIVE_REMOTE" --min-age "$GDRIVE_RETENTION" --log-file="$LOG_FILE" 2>/dev/null || \
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Warning: Drive prune failed" >> "$LOG_FILE"

# Keep only last 7 days of local backups
find "$BACKUP_DIR" -name "adel_resort_*_local.sql.gz" -mtime +7 -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Old local backups pruned" >> "$LOG_FILE"