#!/usr/bin/env bash
# =============================================================
# Database backup script — runs via cron as user 'adel'
# - Creates compressed PostgreSQL backup
# - Sends backup to Gmail via msmtp
# - Prunes backups older than 30 days
# Cron: 0 2 * * * /home/adel/adel-beach-resort/deploy/backup-db.sh
# =============================================================
set -euo pipefail

BACKUP_DIR="/home/adel/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/adel_resort_$TIMESTAMP.sql.gz"
BACKUP_EMAIL="bkmoonsalter@gmail.com"
LOG_FILE="/var/log/backup.log"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup..." >> "$LOG_FILE"

# Create backup
pg_dump adel_resort | gzip > "$BACKUP_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup created: $BACKUP_FILE" >> "$LOG_FILE"

# Send email with backup attached
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
SUBJECT="Adel Resort DB Backup - $TIMESTAMP"

cat <<EOF | msmtp -a adel-backup --attachment "$BACKUP_FILE" "$BACKUP_EMAIL" 2>> "$LOG_FILE" || echo "[$(date '+%Y-%m-%d %H:%M:%S')] Warning: Email send failed" >> "$LOG_FILE"
Subject: $SUBJECT
From: adel-backup@adel-resort.ph
To: $BACKUP_EMAIL

Adel Resort Database Backup

Timestamp: $(date '+%Y-%m-%d %H:%M:%S')
File: adel_resort_$TIMESTAMP.sql.gz
Size: $FILE_SIZE
Server: $(hostname)

This is an automated daily backup.
EOF

# Prune backups older than 30 days
find "$BACKUP_DIR" -name "adel_resort_*.sql.gz" -mtime +30 -delete
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Old backups pruned" >> "$LOG_FILE"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup complete" >> "$LOG_FILE"