# IONOS VPS Deployment Guide — Adel Beach Resort

**VPS:** 2 vCore, 2GB RAM, 80GB NVMe, Ubuntu 24.04  
**IP:** 74.208.142.44  
**Domain:** adel-resort.ph  
**Architecture:**
```
Internet
  ├── adel-resort.ph      → Nginx:443 → Next.js:3000 (PM2)
  ├── api.adel-resort.ph   → Nginx:443 → Gunicorn:8000 (Supervisor)
  │                                         ├── PostgreSQL:5432
  │                                         └── Cloudinary (media)
  └── Let's Encrypt SSL (auto-renew via Certbot)
```

---

## Step 1: SSH into Your VPS

IONOS sends your root password via email (check your IONOS account email). If you didn't receive it, reset it in the IONOS Cloud Panel under **Server → Actions → Reset Root Password**.

```bash
# From your local machine (PowerShell or Git Bash)
ssh root@74.208.142.44
# Enter the root password when prompted
```

---

## Step 2: Set Up SSH Key (Optional but Recommended)

On your **local machine**, generate an SSH key if you don't have one:

```bash
ssh-keygen -t ed25519 -C "adel@ionos"
# Press Enter for default path, set a passphrase if you want
```

Copy it to the server:

```bash
ssh-copy-id root@74.208.142.44
# Or manually: cat ~/.ssh/id_ed25519.pub | ssh root@74.208.142.44 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

Test it:

```bash
ssh root@74.208.142.44
# Should connect without password
```

---

## Step 3: Run the Server Setup Script

Once SSH'd into the VPS as root:

```bash
# Download and run the setup script
cd /tmp
git clone https://github.com/arcosesd2/Adel-Resort.git temp-repo
bash temp-repo/deploy/setup-server.sh
rm -rf temp-repo
```

**IMPORTANT:** Before running, edit the PostgreSQL password in `setup-server.sh`:
```bash
# Change this line to a real secure password
sudo -u postgres psql -c "ALTER USER adel WITH PASSWORD 'YOUR_REAL_SECURE_PASSWORD';"
```

This script installs: Python 3, Node.js 20, PostgreSQL, Nginx, Supervisor, PM2, Certbot, UFW firewall.

---

## Step 4: Switch to Deploy User & Clone Repo

```bash
su - adel

# Clone the repo
git clone https://github.com/arcosesd2/Adel-Resort.git /home/adel/adel-beach-resort
cd /home/adel/adel-beach-resort
```

---

## Step 5: Configure Environment Variables

### Backend .env

```bash
cp deploy/env.backend.example backend/.env
nano backend/.env
```

Fill in all values. Generate a Django secret key:

```bash
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Or use:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

Your `backend/.env` should look like:

```env
SECRET_KEY=<generated-key>
DEBUG=False
ALLOWED_HOSTS=api.adel-resort.ph,adel-resort.ph,www.adel-resort.ph,74.208.142.44
CSRF_TRUSTED_ORIGINS=https://adel-resort.ph,https://www.adel-resort.ph,https://api.adel-resort.ph
CORS_ALLOWED_ORIGINS=https://adel-resort.ph,https://www.adel-resort.ph
FRONTEND_URL=https://adel-resort.ph
DATABASE_URL=postgres://adel:YOUR_REAL_SECURE_PASSWORD@localhost:5432/adel_resort
CLOUDINARY_CLOUD_NAME=<your-value>
CLOUDINARY_API_KEY=<your-value>
CLOUDINARY_API_SECRET=<your-value>
STRIPE_SECRET_KEY=<your-value>
STRIPE_WEBHOOK_SECRET=<your-value>

# Email (uses Gmail SMTP — set these on the VPS!)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=adel-backup@adel-resort.ph
EMAIL_HOST_PASSWORD=<your-gmail-app-password>
DEFAULT_FROM_EMAIL=Adel Beach Resort <noreply@adel-resort.ph>
```

**Important:** You must set the email environment variables on the VPS for email verification and password reset to work. The `EMAIL_HOST_USER` must be a Gmail account with an App Password (see Step 14).

### Frontend .env.local

```bash
cp deploy/env.frontend.example frontend/.env.local
nano frontend/.env.local
```

```env
NEXT_PUBLIC_API_URL=https://api.adel-resort.ph
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-value>
```

---

## Step 6: Run the Deploy Script

```bash
bash deploy/deploy.sh
```

This will:
1. Create Python venv & install dependencies
2. Run migrations & collectstatic
3. Load room fixtures (first deploy only)
4. Build the Next.js frontend
5. Start Gunicorn (via Supervisor) and Next.js (via PM2)

---

## Step 7: Configure Nginx

```bash
# Copy the Nginx config
sudo cp deploy/nginx/adel-resort.conf /etc/nginx/sites-available/adel-resort.conf
sudo ln -sf /etc/nginx/sites-available/adel-resort.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 8: Configure Supervisor (Django/Gunicorn)

```bash
sudo cp deploy/supervisor/gunicorn.conf /etc/supervisor/conf.d/gunicorn.conf
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start gunicorn
sudo supervisorctl status gunicorn
```

---

## Step 9: Start Next.js with PM2

```bash
cd /home/adel/adel-beach-resort
pm2 start deploy/pm2/ecosystem.config.js
pm2 save
pm2 startup
# Run the command it outputs (with sudo) to enable auto-start on boot
```

---

## Step 10: DNS Configuration (IONOS Domain Panel)

Go to **IONOS → Domains & SSL → adel-resort.ph → DNS Settings** and add:

| Type | Host | Points to | TTL |
|------|------|-----------|-----|
| A | @ | 74.208.142.44 | 1 hour |
| A | www | 74.208.142.44 | 1 hour |
| A | api | 74.208.142.44 | 1 hour |

DNS propagation takes 5 minutes to 48 hours (usually under 1 hour).

Test with:

```bash
# From your local machine
nslookup adel-resort.ph
nslookup api.adel-resort.ph
```

---

## Step 11: SSL with Let's Encrypt (After DNS Propagates)

```bash
sudo certbot --nginx -d adel-resort.ph -d www.adel-resort.ph -d api.adel-resort.ph
```

Certbot will:
- Obtain SSL certificates
- Auto-modify Nginx config for HTTPS
- Set up auto-renewal (cron)

Test auto-renewal:

```bash
sudo certbot renew --dry-run
```

---

## Step 12: Set Up Cron Jobs

```bash
# As user adel
crontab -e
```

Add these lines:

```cron
# Database backup daily at 2 AM (emails backup to Gmail)
0 2 * * * /home/adel/adel-beach-resort/deploy/backup-db.sh >> /var/log/backup.log 2>&1

# Local database backup every 30 minutes (no email, pruned after 7 days)
*/30 * * * * /home/adel/adel-beach-resort/deploy/backup-db-local.sh >> /var/log/backup-local.log 2>&1

# Cancel expired bookings (unpaid > 1h) — every 5 minutes
*/5 * * * * cd /home/adel/adel-beach-resort/backend && venv/bin/python manage.py cancel_expired_bookings >> /var/log/cron-bookings.log 2>&1

# Expire stale pending payments (> 48h unverified) — every 2 hours
0 */2 * * * cd /home/adel/adel-beach-resort/backend && venv/bin/python manage.py expire_stale_payments >> /var/log/cron-payments.log 2>&1

# Auto-complete past bookings (check-out date passed) — daily at 1 AM
0 1 * * * cd /home/adel/adel-beach-resort/backend && venv/bin/python manage.py auto_complete_bookings >> /var/log/cron-bookings.log 2>&1

# Deactivate expired vouchers — daily at 3 AM
0 3 * * * cd /home/adel/adel-beach-resort/backend && venv/bin/python manage.py deactivate_expired_vouchers >> /var/log/cron-vouchers.log 2>&1

# Warn staff about bookings approaching payment deadline (1h deadline) — every 15 minutes
*/15 * * * * cd /home/adel/adel-beach-resort/backend && venv/bin/python manage.py warn_payment_deadline >> /var/log/cron-bookings.log 2>&1

# Send abandoned booking emails (1h after no payment) — every 30 min
*/30 * * * * cd /home/adel/adel-beach-resort/backend && venv/bin/python manage.py send_abandoned_booking_emails >> /var/log/cron-emails.log 2>&1

# Send check-in reminders (for bookings checking in tomorrow) — daily at 8 AM
0 8 * * * cd /home/adel/adel-beach-resort/backend && venv/bin/python manage.py send_checkin_reminders >> /var/log/cron-emails.log 2>&1

# Send review requests (2 days after checkout) — daily at 9 AM
0 9 * * * cd /home/adel/adel-beach-resort/backend && venv/bin/python manage.py send_review_requests >> /var/log/cron-emails.log 2>&1

# Send promo expiry reminders — daily at 10 AM
0 10 * * * cd /home/adel/adel-beach-resort/backend && venv/bin/python manage.py send_promo_expiry_reminders >> /var/log/cron-emails.log 2>&1

# Resolve stale chat conversations (> 7 days inactive) — daily at 4 AM
0 4 * * * cd /home/adel/adel-beach-resort/backend && venv/bin/python manage.py resolve_stale_conversations >> /var/log/cron-chat.log 2>&1

# Cleanup old data (login attempts, activity logs, notifications, tokens) — weekly on Sunday at 5 AM
0 5 * * 0 cd /home/adel/adel-beach-resort/backend && venv/bin/python manage.py cleanup_old_data >> /var/log/cron-cleanup.log 2>&1

# OR run all cron tasks at once (alternative to individual entries above):
# 0 * * * * cd /home/adel/adel-beach-resort/backend && venv/bin/python manage.py run_all_crons >> /var/log/cron-all.log 2>&1
```

---

## Step 13: Create Django Superuser

```bash
cd /home/adel/adel-beach-resort/backend
source venv/bin/activate
python manage.py createsuperuser
```

Admin panel: `https://api.adel-resort.ph/admin/`

---

## Step 14: Set Up msmtp for Backup Emails

The backup script sends database backups to Gmail. Install and configure msmtp:

```bash
sudo apt install msmtp msmtp-mta

# Create config file
sudo nano /etc/msmtprc
```

Add this configuration (use a Gmail App Password, not your regular password):

```
defaults
auth on
tls on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile /var/log/msmtp.log

account adel-backup
host smtp.gmail.com
port 587
from adel-backup@adel-resort.ph
user bkmoonsalter@gmail.com
password YOUR_GMAIL_APP_PASSWORD

account default : adel-backup
```

```bash
# Set permissions
sudo chmod 600 /etc/msmtprc

# Test email sending
echo "Test email from Adel Resort backup" | msmtp -a adel-backup bkmoonsalter@gmail.com

# Make sure log file exists
sudo touch /var/log/msmtp.log
sudo chown adel:adel /var/log/msmtp.log
```

**To create a Gmail App Password:**
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification (if not already)
3. Go to App Passwords → Create a new app password for "Mail" on "Other (Custom name)" → enter "Adel Resort Backup"
4. Use the generated 16-character password in the msmtp config

---

```bash
cd /home/adel/adel-beach-resort/backend
source venv/bin/activate
python manage.py createsuperuser
```

Admin panel: `https://api.adel-resort.ph/admin/`

---

## Verify Everything Works

```bash
# Check services are running
sudo supervisorctl status gunicorn
pm2 status

# Test backend
curl -I http://localhost:8000/api/rooms/
# Should return 200

# Test frontend
curl -I http://localhost:3000
# Should return 200

# Test via domain (after DNS)
curl -I https://adel-resort.ph
curl -I https://api.adel-resort.ph/api/rooms/
```

---

## Common Commands

```bash
# View logs
sudo tail -f /var/log/gunicorn/access.log     # Backend logs
pm2 logs adel-frontend                          # Frontend logs
sudo tail -f /var/log/nginx/error.log          # Nginx errors

# Restart services
sudo supervisorctl restart gunicorn             # Backend
pm2 restart adel-frontend                       # Frontend
sudo systemctl reload nginx                     # Nginx

# Redeploy after code changes
cd /home/adel/adel-beach-resort
bash deploy/deploy.sh

# Check disk/memory usage
df -h
free -m
```

---

## Troubleshooting

**502 Bad Gateway:** Service not running. Check `supervisorctl status` and `pm2 status`.

**Static files not loading:** Run `python manage.py collectstatic` and check Nginx static alias path.

**Database connection error:** Verify `DATABASE_URL` in `.env` and that PostgreSQL is running (`sudo systemctl status postgresql`).

**SSL certificate error:** Make sure DNS is pointing to 74.208.142.44 before running Certbot.

**Out of memory (2GB RAM):** Add swap space:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```
