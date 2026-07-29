# TenantHub — Multi-Tenant SaaS Platform

**Paralax Lab Internship · Week 1 & 2 Deliverable**

A production-grade multi-tenant SaaS boilerplate with full tenant isolation, JWT authentication, subdomain routing, and a complete dashboard UI.

---

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
Import `postman-collection.json` into Postman or Insomnia, then run requests against `http://localhost:5000/api/bookings` after starting the server (see "How to Run Locally" below).

---

## 🗂 What Was Built (Week 1)

### Architecture Overview
```
┌─────────────────────┐       ┌─────────────────────────────┐
│   React (Vite)       │  ───▶ │   Express.js API Server      │
│   client/:5173        │       │   server/:5000                │
│                       │       │                               │
│  Landing Page         │       │  /api/auth/*                  │
│  Login / Register     │       │  /api/tenants/*                │
│  Onboarding Flow      │       │  /api/dashboard/*              │
│  Dashboard Shell       │       │  /api/bookings/*                │
│  Responsive Sidebar   │       │                               │
│  Booking Calendar     │       │  MongoDB (tenant-scoped)      │
└─────────────────────┘       └─────────────────────────────┘
```

### Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router 7, Axios |
| Backend | Node.js, Express 5, ES Modules |
| Database | MongoDB (Mongoose ODM), tenant-scoped queries |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Validation | envalid (.env), Zod, express-validator |
| Security | Helmet, CORS, express-rate-limit, cookie-parser |
| DevOps | Docker Compose (MongoDB + mongo-express), nodemon |

## 🏗 Approach & Design Decisions

### 1. Multi-Tenant Schema Design
Every tenant lives in a shared MongoDB database. Isolation is enforced by scoping every query to the authenticated user's `tenantId`, and by unique compound indexes that prevent cross-tenant collisions.

```js
// users collection — tenantId is required on every document
const userSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  email: { type: String, required: true },
  // ...
});

// same email OK across different tenants, unique within a tenant
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
```

Every model that stores tenant data (users, bookings, etc.) follows the same pattern: a required `tenantId` field, a compound unique index scoped to that tenant, and a middleware layer that injects `tenantId` into every query — so a controller can never accidentally fetch another tenant's documents.

> **Note:** Update this section with the exact mechanism you used if it differs — e.g. if you're using a Mongoose plugin or a query-middleware helper (like `withTenant(tenantId)`) that auto-injects the filter, name that helper here so reviewers can find it in the code.

### 2. Tenant Detection (Subdomain Routing)
Tenants are identified via:
- `X-Tenant-Slug` header — used in development and by the React frontend
- Subdomain parsing — `acme.app.com` → extracts `acme` and looks up the tenant

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

| Role | Can view users | Can manage tenant | Notes |
|---|---|---|---|
| owner | ✓ | ✓ | Created on onboard |
| admin | ✓ | ✗ | Invited by owner |
| member | ✗ | ✗ | Default role |

### 5. Frontend Architecture
- **AuthContext** — global auth state with login, register, logout
- **Axios interceptor** — auto-attaches `Authorization` and `X-Tenant-Slug` headers
- **Protected routes** — `PrivateRoute` redirects unauthenticated users
- **CSS Modules** — scoped styles per page, global utilities in `styles/global.css`

## 🚀 How to Run Locally

### Prerequisites
- Node.js ≥ 18
- Docker & Docker Compose (for MongoDB) — or a natively installed/running MongoDB instance
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

### Step 2 — Start MongoDB with Docker
```bash
# From the project root
docker-compose up -d

# Verify it's running
docker-compose ps
```
This starts MongoDB on `localhost:27017`. If you already have MongoDB running natively (e.g. as a Windows service), you can skip Docker — `MONGODB_URI=mongodb://localhost:27017/multitenant_saas` works the same either way.

### Step 3 — Configure environment variables
The `server/.env` file is pre-configured for local development:

```
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

MONGODB_URI=mongodb://localhost:27017/multitenant_saas

JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_in_production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

COOKIE_SECRET=your_super_secret_cookie_key_change_in_production

BASE_DOMAIN=localhost:5173
SUBDOMAIN_ENABLED=true
```
⚠️ In production, replace all secrets with strong random values.

### Step 4 — Seed test data
```bash
cd server
npm run db:seed      # Populates test tenants, users, and bookings
```

### Step 5 — Start the servers
```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

The app is now running at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health check: http://localhost:5000/health

## 🧪 Test Credentials
All test users have password: `password123`

| Tenant Slug | Email | Role |
|---|---|---|
| acme | admin@acme.com | owner |
| acme | manager@acme.com | admin |
| acme | user@acme.com | member |
| techstart | ceo@techstart.com | owner |
| techstart | dev@techstart.com | member |
| creative | founder@creative.com | owner |
| creative | designer@creative.com | member |

**Login flow:** Go to http://localhost:5173/login → enter workspace slug (e.g. `acme`) → enter email and password.

## 📡 API Reference

### Authentication
| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | /api/auth/register | tenant header | Register new user |
| POST | /api/auth/login | tenant header | Login, get tokens |
| POST | /api/auth/refresh | — | Rotate refresh token |
| POST | /api/auth/logout | — | Invalidate refresh token |
| GET | /api/auth/me | ✓ Bearer | Get current user info |

### Tenants
| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | /api/tenants/onboard | — | Create new tenant+owner |
| GET | /api/tenants/check-slug/:s | — | Check slug availability |
| GET | /api/tenants/current | ✓ | Get current tenant info |

### Dashboard
| Method | Path | Auth Required | Role | Description |
|---|---|---|---|---|
| GET | /api/dashboard/stats | ✓ | any | Workspace stats |
| GET | /api/dashboard/users | ✓ | owner, admin | List all users |

### Bookings
| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | /api/bookings | ✓ | Create booking (idempotent) |
| GET | /api/bookings | ✓ | List bookings |
| GET | /api/bookings/:id | ✓ | Get booking detail |
| PUT | /api/bookings/:id | ✓ | Update booking |
| DELETE | /api/bookings/:id | ✓ | Delete booking |

All tenant-scoped routes require the `X-Tenant-Slug` header (set automatically by the frontend).

## 📁 Project Structure
```
├── client/                    # React + Vite frontend
│   └── src/
│       ├── context/           # AuthContext (global auth state)
│       ├── components/        # Shared UI components
│       ├── hooks/              # Custom React hooks
│       ├── utils/              # Frontend helper utilities
│       ├── pages/              # Route-level page components
│       │   ├── LandingPage     # Marketing/onboarding homepage
│       │   ├── LoginPage       # Tenant-aware login
│       │   ├── RegisterPage    # Join existing workspace
│       │   ├── OnboardPage     # Multi-step new tenant setup
│       │   └── dashboard/      # Protected dashboard shell
│       │       ├── DashboardLayout    # Sidebar + nav
│       │       ├── DashboardHome      # Stats + overview
│       │       ├── DashboardUsers     # Team member list
│       │       ├── DashboardSettings  # Workspace config
│       │       ├── BookingsPage       # Booking calendar/list
│       │       └── BookingDetailPage  # Booking detail + edit/delete
│       ├── services/
│       │   └── api.js          # Axios instance + all API calls
│       └── styles/
│           └── global.css      # Shared utility styles
│
├── server/                    # Express.js API
│   └── src/
│       ├── config/
│       │   ├── env.js          # .env validation with envalid
│       │   └── database.js     # MongoDB connection setup
│       ├── controllers/        # Route handler logic
│       ├── middleware/         # auth, tenant detection, errors
│       ├── models/             # Mongoose schemas & models
│       ├── routes/             # Express routers
│       ├── validators/         # Zod validation schemas
│       ├── utils/
│       │   ├── jwt.js          # Token generation + hashing
│       │   └── zodValidate.js  # Zod validation middleware
│       └── database/
│           └── seed.js         # Test data seeder
│
├── postman-collection.json    # API collection for testing
├── docker-compose.yml         # MongoDB + mongo-express
└── README.md                  # This file
```

## 🔒 Security Checklist
- [x] Tenant isolation enforced via required `tenantId` on every document + tenant-scoped queries in middleware
- [x] Passwords hashed with bcrypt (12 rounds)
- [x] JWT access tokens expire in 1 hour
- [x] Refresh tokens are hashed (SHA-256) before DB storage
- [x] Refresh token rotation on every use (old token deleted)
- [x] Rate limiting: 100 requests per 15 minutes per IP
- [x] Helmet.js sets secure HTTP headers
- [x] CORS restricted to known origins
- [x] `.env` validated at startup — server won't start with missing vars
- [x] Input validation on all user-facing endpoints (express-validator + Zod)
- [x] Compound unique indexes prevent cross-tenant conflicts (e.g. `tenantId + email`, `tenantId + idempotencyKey`)

## 🐳 Docker Commands Reference
```bash
# Start database
docker-compose up -d

# Stop database
docker-compose down

# View logs
docker-compose logs mongo

# Open mongo-express UI (optional)
docker-compose --profile tools up -d mongo-express
# Then visit http://localhost:8081

# Reset database (destructive)
docker-compose down -v && docker-compose up -d
```

## 📝 Notes & Known Limitations
- **Subdomain routing in development:** Browsers don't resolve `acme.localhost` without `/etc/hosts` entries. The app uses the `X-Tenant-Slug` header as a fallback, which the React frontend sets automatically via localStorage.
- **Production subdomain setup:** Configure a wildcard DNS record (`*.yourdomain.com` → your-server-ip) and update `BASE_DOMAIN` in `.env`.
- **mongo-express:** Included as an optional Docker profile. Run with `--profile tools` flag.
- **Refresh token storage:** Currently stored in the DB for revocability. For high scale, consider Redis.
- **Database migration:** The stack moved from PostgreSQL (Week 1) to MongoDB (Week 2) — see "Docker Compose fix" above for details on why and what changed.

---

Built for Paralax Lab Internship — Week 1 & 2 · Multi-Tenant SaaS Platform
