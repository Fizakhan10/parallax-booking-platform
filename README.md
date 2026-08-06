# TenantHub — Multi-Tenant SaaS Platform

**Paralax Lab Internship · Week 1 + Week 2 + Week 3**

A production-grade multi-tenant SaaS platform with full tenant isolation, JWT auth, booking management, and Stripe subscription billing.

---

## 🗂 What Was Built

### Architecture Overview

```
┌──────────────────────────┐        ┌────────────────────────────────────┐
│   React 19 + Vite        │ ─────▶ │   Express 5 API Server             │
│   client/:5173           │        │   server/:5000                     │
│                          │        │                                    │
│  Landing Page            │        │  /api/auth/*      JWT auth         │
│  Login / Register        │        │  /api/tenants/*   onboarding       │
│  Onboarding Wizard       │        │  /api/dashboard/* stats            │
│  Dashboard Shell         │        │  /api/bookings/*  CRUD + calendar  │
│  Bookings Calendar/List  │        │  /api/billing/*   Stripe billing   │
│  Billing & Plans UI      │        │                                    │
│  Invoice History         │        │  MongoDB (multi-tenant RBAC)       │
└──────────────────────────┘        └────────────────────────────────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │   Stripe           │
                                    │  Checkout Sessions  │
                                    │  Webhooks          │
                                    │  Customer Portal   │
                                    └────────────────────┘
```

### Stack

| Layer      | Technology                                                    |
|------------|---------------------------------------------------------------|
| Frontend   | React 19, Vite 8, React Router 7, Axios, date-fns, lucide-react |
| Backend    | Node.js, Express 5, ES Modules                                |
| Database   | MongoDB 7 + Mongoose (multi-tenant RBAC)                      |
| Auth       | JWT (access + refresh tokens), bcrypt (12 rounds)             |
| Validation | Zod (server), envalid (.env), client-side mirrored validation |
| Payments   | Stripe — Checkout, Webhooks, Customer Portal, Invoices        |
| Security   | Helmet, CORS, express-rate-limit, webhook signature verification |
| DevOps     | Docker Compose (MongoDB), nodemon                             |

---

## 📋 Weekly Deliverables

### Week 1 — Multi-Tenant Foundation
- Multi-tenant MongoDB schema with tenant isolation via RBAC
- JWT authentication with access + refresh token rotation
- Tenant onboarding wizard (2-step: workspace → account)
- Wildcard subdomain routing (`X-Tenant-Slug` header strategy)
- Dashboard shell with responsive sidebar
- `.env` validation with `envalid` — server won't start with missing config

### Week 2 — Booking APIs & Calendar UI
- Idempotent booking CRUD (`POST` with `idempotencyKey` UUID)
- Zod validation with standard error schema `{ success, message, errors[] }`
- Calendar view (custom month grid with date-fns, no third-party calendar lib)
- List view with inline status editing, search, and filter
- Create/Edit modal with full client-side validation
- Booking detail page with quick-status buttons
- `react-hot-toast` notifications + exponential backoff retry logic
- Postman collection (`postman-collection.json`)

### Week 3 — Payments, Webhooks & Billing UI
- Stripe Checkout sessions for plan upgrades
- Secure webhook handler with **signature verification** (`stripe.webhooks.constructEvent`)
- **Idempotent webhook processing** — `BillingEvent` model deduplicates by `stripeEventId`
- Handles: `customer.subscription.created/updated/deleted`, `invoice.payment_succeeded/failed`
- Stripe Customer Portal for self-serve payment method management
- Cancel / reactivate subscription flows
- Plans grid showing current plan, upgrade/downgrade buttons
- Invoice history table with PDF download links
- Webhook-driven UI updates (plan & status auto-update after Stripe callback)

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js ≥ 18
- Docker & Docker Compose **OR** MongoDB running natively
- Git
- Stripe account (free test mode)

### Step 1 — Clone & install dependencies

```bash
git clone https://github.com/Fizakhan10/parallax-booking-platform
cd parallax-booking-platform

cd server && npm install
cd ../client && npm install
```

### Step 2 — Start MongoDB

**Option A — Docker (recommended):**
```bash
# From project root
docker-compose up -d
docker-compose ps   # verify mongo is healthy
```

**Option B — Native MongoDB (already running):**
No action needed — the default `MONGODB_URI` connects to `localhost:27017`.

### Step 3 — Configure environment variables

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/multitenant_saas

JWT_SECRET=your_long_random_secret
JWT_REFRESH_SECRET=your_other_long_random_secret
COOKIE_SECRET=your_cookie_secret

# Stripe (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # see Step 5

# Stripe Price IDs (create in Stripe Dashboard > Products)
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

Also update `client/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Step 4 — Seed database

```bash
cd server
npm run db:seed
```

This creates 3 tenants (acme, techstart, creative), 7 users, and 14 sample bookings.

### Step 5 — Set up Stripe webhooks (for local testing)

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli), then:

```bash
stripe login
stripe listen --forward-to localhost:5000/api/billing/webhook
```

Copy the `whsec_...` secret it prints and set it as `STRIPE_WEBHOOK_SECRET` in `server/.env`.

### Step 6 — Start servers

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

| Service   | URL                              |
|-----------|----------------------------------|
| Frontend  | http://localhost:5173            |
| API       | http://localhost:5000            |
| Health    | http://localhost:5000/health     |
| Mongo UI  | http://localhost:8081 (optional) |

---

## 🧪 Test Credentials

Password for all accounts: **`password123`**

| Tenant Slug  | Email                 | Role   |
|--------------|-----------------------|--------|
| `acme`       | admin@acme.com        | owner  |
| `acme`       | manager@acme.com      | admin  |
| `acme`       | user@acme.com         | member |
| `techstart`  | ceo@techstart.com     | owner  |
| `techstart`  | dev@techstart.com     | member |
| `creative`   | founder@creative.com  | owner  |
| `creative`   | designer@creative.com | member |

---

## 📡 API Reference

### Auth
| Method | Path                | Description              |
|--------|---------------------|--------------------------|
| POST   | /api/auth/register  | Register new user        |
| POST   | /api/auth/login     | Login, get tokens        |
| POST   | /api/auth/refresh   | Rotate refresh token     |
| POST   | /api/auth/logout    | Invalidate refresh token |
| GET    | /api/auth/me        | Get current user         |

### Bookings
| Method | Path                       | Description              |
|--------|----------------------------|--------------------------|
| GET    | /api/bookings              | List (filter/paginate)   |
| POST   | /api/bookings              | Create (idempotent)      |
| GET    | /api/bookings/stats        | Aggregated stats         |
| GET    | /api/bookings/:id          | Get single booking       |
| PUT    | /api/bookings/:id          | Full update              |
| PATCH  | /api/bookings/:id/status   | Status update only       |
| DELETE | /api/bookings/:id          | Delete booking           |

### Billing (Week 3)
| Method | Path                    | Auth | Description                      |
|--------|-------------------------|------|----------------------------------|
| GET    | /api/billing/plans      | —    | List all plans                   |
| GET    | /api/billing/status     | ✓    | Current subscription status      |
| GET    | /api/billing/invoices   | ✓    | Invoice history                  |
| POST   | /api/billing/checkout   | ✓    | Create Stripe Checkout session   |
| POST   | /api/billing/portal     | ✓    | Open Stripe Customer Portal      |
| POST   | /api/billing/cancel     | ✓    | Cancel subscription at period end|
| POST   | /api/billing/reactivate | ✓    | Undo pending cancellation        |
| POST   | /api/billing/webhook    | —    | Stripe webhook (raw body)        |

---

## 🔒 Security

| Protection | Implementation |
|-----------|----------------|
| Tenant isolation | MongoDB RBAC — every query scoped to `tenantId` |
| Auth | JWT access tokens (1h) + refresh rotation (7d) |
| Passwords | bcrypt 12 rounds |
| Webhooks | `stripe.webhooks.constructEvent` signature verification |
| Webhook idempotency | `BillingEvent` collection deduplicates by `stripeEventId` |
| Rate limiting | 200 req / 15 min per IP |
| HTTP headers | Helmet.js |
| CORS | Origin allowlist |
| .env | `envalid` — fails fast on missing config |

---

## 🐳 Docker Commands

```bash
# Start MongoDB
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs mongo

# Open Mongo Express UI (browser DB admin)
docker-compose --profile tools up -d mongo-express
# Visit http://localhost:8081  (admin / admin)

# Full reset (deletes all data)
docker-compose down -v && docker-compose up -d
```

---

## 📁 Project Structure

```
├── client/src/
│   ├── components/bookings/     # BookingFormModal
│   ├── context/                 # AuthContext
│   ├── hooks/                   # useBookings, useBookingStats
│   ├── pages/
│   │   ├── LandingPage          # Marketing homepage
│   │   ├── LoginPage            # Tenant-aware login
│   │   ├── OnboardPage          # 2-step workspace creation
│   │   └── dashboard/
│   │       ├── DashboardHome    # Overview + stats
│   │       ├── BookingsPage     # Calendar + list views
│   │       ├── BookingDetailPage
│   │       ├── BillingPage      # Plans + invoices (Week 3)
│   │       ├── DashboardUsers
│   │       └── DashboardSettings
│   ├── services/api.js          # Axios + all API calls
│   └── utils/booking.utils.js   # Date helpers, validation, calendar grid
│
├── server/src/
│   ├── config/
│   │   ├── env.js               # envalid .env validation
│   │   ├── database.js          # MongoDB connection
│   │   └── stripe.js            # Stripe client + plan config (Week 3)
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── booking.controller.js
│   │   ├── billing.controller.js  # Stripe + webhook handler (Week 3)
│   │   └── tenant.controller.js
│   ├── models/
│   │   ├── tenant.model.js      # + Stripe billing fields (Week 3)
│   │   ├── user.model.js
│   │   ├── booking.model.js
│   │   └── billing.model.js     # BillingEvent + Invoice (Week 3)
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── booking.routes.js
│   │   ├── billing.routes.js    # Week 3
│   │   ├── dashboard.routes.js
│   │   └── tenant.routes.js
│   ├── validators/
│   │   └── booking.validator.js # Zod schemas
│   └── utils/
│       ├── jwt.js
│       └── zodValidate.js
│
├── docker-compose.yml           # MongoDB + Mongo Express
├── postman-collection.json      # 14 API requests
└── README.md
```

---

*Paralax Lab Internship · Week 1–3 · Multi-Tenant SaaS Platform with Stripe Billing*
