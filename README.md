# TenantHub — Multi-Tenant SaaS Platform

Paralax Lab Internship · Week 1 & 2 Deliverable

A production-grade multi-tenant SaaS boilerplate with full tenant isolation, JWT authentication, subdomain routing, and a complete dashboard UI.

## 📅 Week 2 — Booking APIs & Calendar UI

### What was built
- Idempotent booking CRUD APIs (create, read, update, delete) with strict Zod validation on all inputs
- Standardized error response schema across all endpoints
- Full Postman collection (`postman-collection.json`) documenting every booking endpoint
- Custom-built booking calendar (`BookingsPage.jsx`) — no third-party calendar library
- Booking detail view (`BookingDetailPage.jsx`) with edit/delete flows
- Toast notifications and retry logic for API error handling on the frontend
- Mobile-responsive booking pages

### New dependencies
- `zod` — server-side request validation
- `date-fns` — date math for the calendar (month grid generation, formatting, today/past/future checks, grouping bookings by date)
- `lucide-react` — icons used across the booking UI

The calendar month grid is built from scratch in `booking.utils.js` via `getCalendarGrid()` — pure CSS Grid, no FullCalendar or react-big-calendar.

### New API endpoints

| Method | Path | Auth Required | Description |
|--------|------|----------------|-------------|
| POST | /api/bookings | ✓ | Create booking (idempotent) |
| GET | /api/bookings | ✓ | List bookings |
| GET | /api/bookings/:id | ✓ | Get booking detail |
| PUT | /api/bookings/:id | ✓ | Update booking |
| DELETE | /api/bookings/:id | ✓ | Delete booking |

### Idempotency approach
The client generates a UUID v4 before every `POST /api/bookings` call and sends it as `idempotencyKey` in the request body. The server first checks for an existing booking with that `(tenantId, idempotencyKey)` pair — if found, it returns the original booking with a 200 instead of creating a duplicate. A partial unique index on `{ tenantId, idempotencyKey }` in MongoDB acts as the safety net if two identical requests race simultaneously, guaranteeing no double-booking even under concurrent retries.

### Docker Compose fix (per Week 1 feedback)
The stack was switched from PostgreSQL to MongoDB, but `docker-compose.yml` still defined an unused Postgres service — a mismatch flagged in Week 1 feedback. This has been fixed: `docker-compose.yml` now defines a `mongo:7-jammy` service (port 27017, persisted via a named volume, with a `mongosh` healthcheck) plus an optional `mongo-express` UI gated behind `--profile tools`. Since Docker maps container port 27017 to the host, `MONGODB_URI=mongodb://localhost:27017/multitenant_saas` works identically whether MongoDB runs via Docker or natively — no `.env` changes needed.

### Testing the booking APIs
Import `postman-collection.json` into Postman or Insomnia, then run requests against `http://localhost:5000/api/bookings` after starting the server (see "How to Run Locally" above).

## 🗂 What Was Built

### Architecture Overview

```
┌─────────────────────┐       ┌─────────────────────────────┐
│   React (Vite)      │  ───▶ │   Express.js API Server     │
│   client/:5173      │       │   server/:5000               │
│                     │       │                             │
│  Landing Page       │       │  /api/auth/*                │
│  Login / Register   │       │  /api/tenants/*             │
│  Onboarding Flow    │       │  /api/dashboard/*           │
│  Dashboard Shell    │       │                             │
│  Responsive Sidebar │       │  PostgreSQL + RLS           │
└─────────────────────┘       └─────────────────────────────┘
```

### Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 19, Vite 8, React Router 7, Axios         |
| Backend    | Node.js, Express 5, ES Modules                  |
| Database   | PostgreSQL 16 with Row Level Security           |
| Auth       | JWT (access + refresh tokens), bcryptjs         |
| Validation | envalid (.env), express-validator               |
| Security   | Helmet, CORS, express-rate-limit, cookie-parser |
| DevOps     | Docker Compose, nodemon                         |

---

## 🏗 Approach & Design Decisions

### 1. Multi-Tenant Schema Design

Every tenant lives in a shared database. Isolation is enforced at the database level using **PostgreSQL Row Level Security (RLS)**, not at the application layer.

```sql
-- users table has tenant_id foreign key
CREATE TABLE users (
  id          UUID PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email       VARCHAR(255) NOT NULL,
  ...
  UNIQUE(tenant_id, email)   -- same email OK across different tenants
);

-- RLS policy — queries only see rows matching the session variable
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);
```

Before every DB operation, the server sets:
```sql
SET LOCAL app.tenant_id = '<uuid>';
```
This means even a SQL injection that bypasses the ORM cannot read another tenant's data.

### 2. Tenant Detection (Subdomain Routing)

Tenants are identified via:
1. **`X-Tenant-Slug` header** — used in development and by the React frontend
2. **Subdomain parsing** — `acme.app.com` → extracts `acme` and looks up the tenant

```js
// tenantMiddleware.js
const host = req.headers.host  // e.g. "acme.localhost:5173"
const subdomain = host.split('.')[0]  // → "acme"
tenant = await findTenantBySlug(subdomain)
```

### 3. Authentication Flow

```
Login ──▶ access token (1h) + refresh token (7d) returned
         │
         ├─ Access token: stored in memory / localStorage, sent as Bearer header
         └─ Refresh token: stored in DB (hashed with SHA-256), rotated on every use

Token expired ──▶ Axios interceptor calls /api/auth/refresh automatically
                  ──▶ old refresh token deleted, new pair issued (rotation)
```

### 4. Role-Based Access Control

Three roles with scoped permissions:

| Role   | Can view users | Can manage tenant | Notes           |
|--------|---------------|-------------------|-----------------|
| owner  | ✓             | ✓                 | Created on onboard |
| admin  | ✓             | ✗                 | Invited by owner |
| member | ✗             | ✗                 | Default role     |

### 5. Frontend Architecture

- **AuthContext** — global auth state with `login`, `register`, `logout`
- **Axios interceptor** — auto-attaches `Authorization` and `X-Tenant-Slug` headers
- **Protected routes** — `PrivateRoute` redirects unauthenticated users
- **CSS Modules** — scoped styles per page, global utilities in `styles/global.css`

---

## 🚀 How to Run Locally

### Prerequisites

- Node.js ≥ 18
- Docker & Docker Compose (for PostgreSQL)
- Git

### Step 1 — Clone & install dependencies

```bash
git clone <your-repo-url>
cd <project-folder>

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### Step 2 — Start PostgreSQL with Docker

```bash
# From the project root
docker-compose up -d

# Verify it's running
docker-compose ps
```

This starts PostgreSQL on `localhost:5432` and automatically runs `init.sql` to create all tables and RLS policies.

### Step 3 — Configure environment variables

The `server/.env` file is pre-configured for local development:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/multitenant_saas

JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_in_production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

COOKIE_SECRET=your_super_secret_cookie_key_change_in_production

BASE_DOMAIN=localhost:5173
SUBDOMAIN_ENABLED=true
```

> ⚠️ In production, replace all secrets with strong random values.

### Step 4 — Run database migrations and seed data

```bash
cd server
npm run db:migrate   # Creates tables + RLS policies
npm run db:seed      # Populates test tenants and users
```

### Step 5 — Start the servers

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

**The app is now running at:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health check: http://localhost:5000/health

---

## 🧪 Test Credentials

All test users have password: **`password123`**

| Tenant Slug  | Email                    | Role   |
|--------------|--------------------------|--------|
| `acme`       | admin@acme.com           | owner  |
| `acme`       | manager@acme.com         | admin  |
| `acme`       | user@acme.com            | member |
| `techstart`  | ceo@techstart.com        | owner  |
| `techstart`  | dev@techstart.com        | member |
| `creative`   | founder@creative.com     | owner  |
| `creative`   | designer@creative.com    | member |

### Login flow
1. Go to http://localhost:5173/login
2. Enter workspace slug (e.g. `acme`)
3. Enter email and password

---

## 📡 API Reference

### Authentication

| Method | Path                  | Auth Required | Description              |
|--------|-----------------------|---------------|--------------------------|
| POST   | /api/auth/register    | tenant header | Register new user        |
| POST   | /api/auth/login       | tenant header | Login, get tokens        |
| POST   | /api/auth/refresh     | —             | Rotate refresh token     |
| POST   | /api/auth/logout      | —             | Invalidate refresh token |
| GET    | /api/auth/me          | ✓ Bearer      | Get current user info    |

### Tenants

| Method | Path                        | Auth Required | Description              |
|--------|-----------------------------|---------------|--------------------------|
| POST   | /api/tenants/onboard        | —             | Create new tenant+owner  |
| GET    | /api/tenants/check-slug/:s  | —             | Check slug availability  |
| GET    | /api/tenants/current        | ✓             | Get current tenant info  |

### Dashboard

| Method | Path                  | Auth Required | Role         | Description        |
|--------|-----------------------|---------------|--------------|--------------------|
| GET    | /api/dashboard/stats  | ✓             | any          | Workspace stats    |
| GET    | /api/dashboard/users  | ✓             | owner, admin | List all users     |

All tenant-scoped routes require the `X-Tenant-Slug` header (set automatically by the frontend).

---

## 📁 Project Structure

```
├── client/                    # React + Vite frontend
│   └── src/
│       ├── context/           # AuthContext (global auth state)
│       ├── pages/             # Route-level page components
│       │   ├── LandingPage    # Marketing/onboarding homepage
│       │   ├── LoginPage      # Tenant-aware login
│       │   ├── RegisterPage   # Join existing workspace
│       │   ├── OnboardPage    # Multi-step new tenant setup
│       │   └── dashboard/     # Protected dashboard shell
│       │       ├── DashboardLayout  # Sidebar + nav
│       │       ├── DashboardHome    # Stats + overview
│       │       ├── DashboardUsers   # Team member list
│       │       └── DashboardSettings # Workspace config
│       ├── services/
│       │   └── api.js         # Axios instance + all API calls
│       └── styles/
│           └── global.css     # Shared utility styles
│
├── server/                    # Express.js API
│   └── src/
│       ├── config/
│       │   ├── env.js         # .env validation with envalid
│       │   └── database.js    # pg Pool + transaction helpers
│       ├── controllers/       # Route handler logic
│       ├── middleware/        # auth, tenant detection, errors
│       ├── models/            # DB query functions
│       ├── routes/            # Express routers
│       ├── utils/jwt.js       # Token generation + hashing
│       └── database/
│           ├── init.sql       # Schema + RLS policies
│           ├── migrate.js     # Migration runner
│           └── seed.js        # Test data seeder
│
├── docker-compose.yml         # PostgreSQL + pgAdmin
└── README.md                  # This file
```

---

## 🔒 Security Checklist

- [x] PostgreSQL Row Level Security enforces tenant isolation at DB level
- [x] Passwords hashed with bcrypt (12 rounds)
- [x] JWT access tokens expire in 1 hour
- [x] Refresh tokens are hashed (SHA-256) before DB storage
- [x] Refresh token rotation on every use (old token deleted)
- [x] Rate limiting: 100 requests per 15 minutes per IP
- [x] Helmet.js sets secure HTTP headers
- [x] CORS restricted to known origins
- [x] .env validated at startup — server won't start with missing vars
- [x] Input validation on all user-facing endpoints
- [x] Unique constraint on `(tenant_id, email)` prevents cross-tenant conflicts

---

## 🐳 Docker Commands Reference

```bash
# Start database
docker-compose up -d

# Stop database  
docker-compose down

# View logs
docker-compose logs postgres

# Open pgAdmin UI (optional)
docker-compose --profile tools up -d pgadmin
# Then visit http://localhost:5050 (admin@admin.com / admin)

# Reset database (destructive)
docker-compose down -v && docker-compose up -d
```

---

## 📝 Notes & Known Limitations

- **Subdomain routing in development**: Browsers don't resolve `acme.localhost` without `/etc/hosts` entries. The app uses the `X-Tenant-Slug` header as a fallback, which the React frontend sets automatically via `localStorage`.
- **Production subdomain setup**: Configure a wildcard DNS record (`*.yourdomain.com → your-server-ip`) and update `BASE_DOMAIN` in `.env`.
- **pgAdmin**: Included as an optional Docker profile. Run with `--profile tools` flag.
- **Refresh token storage**: Currently stored in the DB for revocability. For high scale, consider Redis.

---

Built for Paralax Lab Internship — Week 1 & 2 · Multi-Tenant SaaS Platform
