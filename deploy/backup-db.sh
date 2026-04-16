#!/usr/bin/env bash
# =============================================================
# Database backup script — runs via cron as user 'adel'
# - Creates compressed PostgreSQL backup
# - Sends backup to Gmail via Python (smtplib)
# - Uploads backup to Google Drive (rclone remote 'gdrive')
# - Prunes local backups older than 30 days; Drive backups older than 180 days
# Cron: 0 2 * * * /home/adel/adel-beach-resort/deploy/backup-db.sh
# =============================================================
set -euo pipefail

BACKUP_DIR="/home/adel/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/adel_resort_$TIMESTAMP.sql.gz"
EMAIL_TO="bkmoonsalter@gmail.com"
EMAIL_FROM="adel-backup@adel-resort.ph"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="adel-backup@adel-resort.ph"
# SMTP_PASS is read from /home/adel/.msmtprc
GDRIVE_REMOTE="gdrive:adel-resort-backups/daily"
GDRIVE_RETENTION="180d"
LOG_FILE="/var/log/backup.log"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup..." >> "$LOG_FILE"

# Create backup
pg_dump adel_resort | gzip > "$BACKUP_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup created: $BACKUP_FILE" >> "$LOG_FILE"

# Extract password from .msmtprc
SMTP_PASS=$(grep -A 10 'account adel-backup' ~/.msmtprc | grep '^password' | head -1 | sed 's/^password\s*//')

# Send email with backup attached using Python
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
python3 -c "
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import os

msg = MIMEMultipart()
msg['Subject'] = 'Adel Resort DB Backup - $TIMESTAMP'
msg['From'] = '$EMAIL_FROM'
msg['To'] = '$EMAIL_TO'

body = '''Adel Resort Database Backup

Timestamp: $(date '+%Y-%m-%d %H:%M:%S')
File: adel_resort_$TIMESTAMP.sql.gz
Size: $FILE_SIZE
Server: $(hostname)

This is an automated daily backup.'''
msg.attach(MIMEText(body, 'plain'))

with open('$BACKUP_FILE', 'rb') as f:
    part = MIMEApplication(f.read(), Name='adel_resort_$TIMESTAMP.sql.gz')
part['Content-Disposition'] = 'attachment; filename=\"adel_resort_$TIMESTAMP.sql.gz\"'
msg.attach(part)

with smtplib.SMTP('$SMTP_HOST', $SMTP_PORT) as server:
    server.starttls()
    server.login('$SMTP_USER', '$SMTP_PASS')
    server.send_message(msg)
print('Email sent successfully')
" 2>> "$LOG_FILE" || echo "[$(date '+%Y-%m-%d %H:%M:%S')] Warning: Email send failed" >> "$LOG_FILE"

# Upload to Google Drive
if rclone copy "$BACKUP_FILE" "$GDRIVE_REMOTE" --log-file="$LOG_FILE" --log-level=INFO; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Uploaded to $GDRIVE_REMOTE" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Warning: Google Drive upload failed" >> "$LOG_FILE"
fi

# Prune Drive backups older than retention window
rclone delete "$GDRIVE_REMOTE" --min-age "$GDRIVE_RETENTION" --log-file="$LOG_FILE" 2>/dev/null || \
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Warning: Drive prune failed" >> "$LOG_FILE"

# Prune local backups older than 30 days
find "$BACKUP_DIR" -name "adel_resort_*.sql.gz" -mtime +30 -delete
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Old backups pruned" >> "$LOG_FILE"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup complete" >> "$LOG_FILE"