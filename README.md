# Adel Beach Resort

A full-stack luxury beach hotel reservation system built with **Next.js 14** (App Router) + **Django 5** + **PostgreSQL** + **Stripe payments**.

---

## Architecture

```
adel-beach-resort/
├── backend/           # Django 5 + DRF API
├── frontend/          # Next.js 14 App Router
└── render.yaml        # Render deployment config
```

---

## Features

- Browse rooms with type/price/capacity filters
- Real-time availability calendar per room and all-rooms view
- JWT authentication (register / login / logout / refresh)
- Booking creation with conflict detection
- Stripe payment integration (PaymentIntents + webhooks)
- User dashboard to view and cancel bookings
- Mobile-responsive design with Tailwind CSS
- Admin panel for managing rooms, bookings, and payments

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL (or SQLite for dev)
- Stripe account (test keys)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your values (SQLite works out of the box without DATABASE_URL)

# Run migrations
python manage.py migrate

# Load sample rooms
python manage.py loaddata fixtures/rooms.json

# Create admin user
python manage.py createsuperuser

# Start server
python manage.py runserver
```

Backend runs at: http://localhost:8000
Admin panel: http://localhost:8000/admin

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_API_URL=http://localhost:8000
#   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Start dev server
npm run dev
```

Frontend runs at: http://localhost:3000

### Stripe Webhook (local testing)

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

stripe login
stripe listen --forward-to localhost:8000/api/payments/webhook/
# Copy the webhook signing secret to backend .env as STRIPE_WEBHOOK_SECRET
```

---

## API Endpoints

```
POST   /api/auth/register/
POST   /api/auth/login/
POST   /api/auth/logout/
POST   /api/auth/refresh/
GET    /api/auth/me/

GET    /api/rooms/                    # Filter: room_type, min_capacity, min_price, max_price
GET    /api/rooms/<id>/
GET    /api/rooms/<id>/availability/
GET    /api/rooms/all-availability/

GET    /api/bookings/                 # Auth required
POST   /api/bookings/
GET    /api/bookings/<id>/
DELETE /api/bookings/<id>/            # Cancels booking

POST   /api/payments/create-intent/  # Auth required
POST   /api/payments/webhook/        # Stripe webhook
POST   /api/payments/confirm/<id>/   # Auth required
```

---

## Deploy to Render

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/adel-beach-resort.git
git push -u origin main
```

### Step 2: Create Render Blueprint

1. Go to [render.com](https://render.com) and sign in
2. Click **New** → **Blueprint**
3. Connect your GitHub repo
4. Render will detect `render.yaml` and show a preview of resources to create:
   - PostgreSQL database (`adel-beach-resort-db`)
   - Backend web service (`adel-beach-resort-backend`)
   - Frontend web service (`adel-beach-resort-frontend`)
5. Click **Apply** to create all resources

### Step 3: Set Environment Variables

After deployment, go to each service's **Environment** settings:

**Backend service:**

| Variable | Value |
|---|---|
| `CORS_ALLOWED_ORIGINS` | `https://adel-beach-resort-frontend.onrender.com` |
| `FRONTEND_URL` | `https://adel-beach-resort-frontend.onrender.com` |
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (from Stripe dashboard) |

**Frontend service:**

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://adel-beach-resort-backend.onrender.com` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` |

> Note: `SECRET_KEY` and `DATABASE_URL` are auto-generated/injected by Render.

### Step 4: Run Database Migrations and Load Fixtures

1. In your backend service on Render, go to **Shell**
2. Run:
```bash
cd backend
python manage.py migrate
python manage.py loaddata fixtures/rooms.json
python manage.py createsuperuser
```

### Step 5: Configure Stripe Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://adel-beach-resort-backend.onrender.com/api/payments/webhook/`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy the signing secret → paste as `STRIPE_WEBHOOK_SECRET` in your backend env vars

### Step 6: Verify Deployment

- Frontend: `https://adel-beach-resort-frontend.onrender.com`
- Backend API: `https://adel-beach-resort-backend.onrender.com/api/rooms/`
- Admin: `https://adel-beach-resort-backend.onrender.com/admin/`

---

## Project Structure

### Backend

```
backend/
├── hotel/
│   ├── settings.py      # Django settings (env-driven)
│   ├── urls.py          # Root URL config
│   └── wsgi.py
├── accounts/            # Custom User model + JWT auth
├── rooms/               # Room model + filters + availability
├── bookings/            # Booking CRUD + conflict detection
├── payments/            # Stripe PaymentIntents + webhook
├── fixtures/
│   └── rooms.json       # Sample room data
├── requirements.txt
└── build.sh             # Render build script
```

### Frontend

```
frontend/
├── app/
│   ├── layout.js        # Root layout (Navbar + Footer)
│   ├── page.js          # Home page (hero + featured rooms)
│   ├── rooms/page.js    # Room listing with filters
│   ├── rooms/[id]/      # Room detail + booking form
│   ├── availability/    # Public availability calendar
│   ├── auth/login/      # Login page
│   ├── auth/register/   # Register page
│   ├── dashboard/       # User bookings list
│   ├── booking/[id]/    # Booking confirmation detail
│   └── checkout/        # Stripe payment step
├── components/
│   ├── Navbar.jsx
│   ├── Footer.jsx
│   ├── RoomCard.jsx
│   ├── RoomFilters.jsx
│   ├── AvailabilityCalendar.jsx
│   ├── PublicCalendar.jsx
│   ├── BookingForm.jsx
│   └── StripePaymentForm.jsx
├── lib/
│   ├── api.js           # Axios instance + JWT interceptors
│   └── auth.js          # Token helpers
├── store/
│   └── authStore.js     # Zustand auth store
└── middleware.js         # Route protection
```

---

## Test Stripe Payments

Use these test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires auth**: `4000 0025 0000 3155`

Any future expiry date and any 3-digit CVC.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, Zustand, Axios |
| Backend | Django 5, DRF, SimpleJWT |
| Database | PostgreSQL (SQLite for dev) |
| Payments | Stripe PaymentIntents |
| Auth | JWT (access + refresh tokens) |
| Deployment | Render (free tier) |
