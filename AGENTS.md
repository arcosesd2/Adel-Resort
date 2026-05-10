# Project Instructions

- This project is located at `C:\Users\Adiel\vps2-adel-resort`
- Always use this as the working directory on app start

# Architecture

- **Backend**: Django 6.0.2 REST API (Python 3.12) — Gunicorn + Supervisor
- **Frontend**: Next.js 15.5 (Node 20) — PM2
- **Reverse Proxy**: Nginx
- **Database**: PostgreSQL (adel_resort db, user: adel)
- **DB Password**: `!??!A@10530501b1515D` (URL-encoded in DATABASE_URL: `%21%3F%3F%21A%4010530501b1515D`)
- **Media Storage**: Cloudinary (cloud: dwx5uhyvd)
- **Email**: Brevo SMTP (user: a9bd1e001@smtp-brevo.com)
- **Payments**: Stripe

# Servers

| Server | IP | Role | SSH User |
|--------|-----|------|----------|
| VPS1 (IONOS) | 74.208.142.44 | Production | root (key auth), adel |
| VPS2 (IONOS L) | 74.208.142.42 | Staging | root (key auth), adel |

- SSH key auth is set up from local machine to both servers (passwords no longer needed)
- adel user on VPS2 has SSH key to adel on VPS1 (for DB sync)
- VPS2: Ubuntu 22.04, 4 vCores, 8GB RAM, Python 3.12 (compiled from source)

# Domains

| Domain | Points To | Purpose |
|--------|-----------|---------|
| adel-resort.ph | 74.208.142.44 | Production frontend |
| api.adel-resort.ph | 74.208.142.44 | Production backend |
| staging.adel-resort.ph | 74.208.142.42 | Staging frontend |
| staging-api.adel-resort.ph | 74.208.142.42 | Staging backend |

Both staging domains have SSL via Certbot (auto-renewal enabled).

# Two-Repo Workflow (CRITICAL)

- **Staging repo**: `vps2-adel-resort/` → GitHub `Staging-Adel-Resort` → VPS2 (`74.208.142.42`)
- **Production repo**: `vps1-adel-resort/` → GitHub `Adel-Resort` → VPS1 (`74.208.142.44`)
- These are **separate repos**, NOT branches. Never deploy staging code directly to VPS1.

## Promotion Path

1. Develop + commit + push in `vps2-adel-resort/` → deploy via `deploy/deploy-staging.sh` → sign off on VPS2
2. In `vps1-adel-resort/`: `git fetch staging && git merge staging/main` → `git push origin main` → run prod deploy

## Do NOT Promote (staging-only files)

- `deploy/deploy-staging.sh`, `deploy/setup-server-staging.sh`
- `deploy/sync-db-from-prod.sh`, `deploy/sync-db.py`
- `deploy/check-*.py`, `deploy/debug-*.py`, `deploy/test-*.py`
- `deploy/env.backend.staging`, `deploy/env.frontend.staging`
- `deploy/nginx/staging.conf`
- `deploy/frontend-*.tar.gz`
- `deploy/pm2/ecosystem.config.js` (staging-specific; prod has its own)
- `frontend/.next/` build artifacts
- Any `.env` or `.env.local` files

## DB Rules

- Run `makemigrations --check` on staging before promoting
- Always run `migrate` on prod after pull
- Never copy rows staging → prod

## Rollback

- `git revert` + redeploy
- Never `reset --hard` on pushed prod

# VPS2 Staging Deployment

- App directory: `/home/adel/adel-beach-resort`
- Backend env: `/home/adel/adel-beach-resort/backend/.env`
- Frontend env: `/home/adel/adel-beach-resort/frontend/.env.local`
- Nginx: `/etc/nginx/sites-available/staging.conf`
- Supervisor: `/etc/supervisor/conf.d/gunicorn.conf`
- PM2: ecosystem config at `/home/adel/adel-beach-resort/deploy/pm2/ecosystem.config.js`
- DB sync script: `/home/adel/adel-beach-resort/deploy/sync-db-from-prod.sh`
- Daily cron at 3 AM syncs production DB to staging (user: adel)

## Key Fixes Applied During Deployment

- Python 3.12 compiled from source on VPS2 (Ubuntu 22.04 ships with 3.10, Django 6 requires 3.12+)
- CSP `connect-src` in both frontend (next.config.js) and backend (middleware.py) was updated to include `https://staging-api.adel-resort.ph` and `https://staging.adel-resort.ph` — without this, cross-origin API calls were blocked
- Frontend `next.config.js` also needs `staging-api.adel-resort.ph` in `remote_patterns` and `img-src`

# Deployment Commands

## Redeploy staging (VPS2) after code changes
```bash
ssh root@74.208.142.42
su - adel -c 'cd /home/adel/adel-beach-resort && git pull'
# Backend:
su - adel -c 'cd /home/adel/adel-beach-resort/backend && source venv/bin/activate && pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate --no-input'
supervisorctl restart gunicorn
# Frontend:
su - adel -c 'cd /home/adel/adel-beach-resort/frontend && npm ci && npm run build'
su - adel -c 'pm2 restart adel-frontend'
```

## Redeploy production (VPS1) after promotion
```bash
ssh root@74.208.142.44
su - adel -c 'cd /home/adel/adel-beach-resort && git pull'
# Backend:
su - adel -c 'cd /home/adel/adel-beach-resort/backend && source venv/bin/activate && pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate --no-input'
supervisorctl restart gunicorn
# Frontend:
su - adel -c 'cd /home/adel/adel-beach-resort/frontend && npm ci && npm run build'
su - adel -c 'pm2 restart adel-frontend'
```

## Manual DB sync (staging ← production)
```bash
ssh adel@74.208.142.42
bash /home/adel/adel-beach-resort/deploy/sync-db-from-prod.sh
```

## IONOS VPS Access
- SSH passwords (for initial setup only, key auth is now active):
  - VPS1 root: `yuK0JJXNoQfKJK`
  - VPS2 root: `mt632I0SBbLj0tp`
- IONOS control panel: https://ionos.com (separate from SSH)