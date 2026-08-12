# TenantHub — Multi-Tenant SaaS Platform

**Paralax Lab Internship · Week 1 + Week 2 + Week 3 + Week 4**

A production-grade multi-tenant SaaS platform with full tenant isolation, JWT auth, booking management, Stripe subscription billing, and real-time collaborative editing powered by CRDTs.

---

## 🤝 Week 4 — Real-Time Collaboration (CRDTs)

### What was built
- **Yjs CRDT engine** integrated on the backend — every booking has a shared `Y.Doc` that automatically resolves concurrent edits without conflicts
- **WebSocket collaboration server** mounted on the same port as the REST API (`/collaboration/:bookingId`) — no extra port needed
- **JWT-authenticated WebSocket upgrade** — token verified + tenant ownership of the booking confirmed before any client is admitted
- **Collaborative rich-text editor** (`CollaborativeEditor.jsx`) built with Lexical, replacing the static notes textarea on `BookingDetailPage`
- **Real-time presence indicators** — live avatar strip (top-right of editor) showing all connected users + coloured cursor carets at each user's current position
- **Graceful fallback** — if WebSocket is unavailable or all 3 reconnection attempts fail, the editor silently degrades to a plain `<textarea>` with a non-blocking banner and continues auto-saving via REST
- **Automated tests** — 4 backend test files (roomManager, presenceManager, conflict resolution, disconnection edge cases) + 2 frontend test files (CollaborativeEditor states, PresenceOverlay rendering)

### New files

```
server/src/collaboration/
├── roomManager.js          # Y.Doc lifecycle — create, seed from DB, persist, destroy
├── presenceManager.js      # In-memory user join/leave/cursor state per room
├── yjsServer.js            # WebSocket server, JWT auth, y-protocols sync + awareness
└── __tests__/
    ├── roomManager.test.js         # Doc creation, singleton, seed, persist, cleanup
    ├── presenceManager.test.js     # Join/leave/cursor/colour/getPresence
    ├── conflictResolution.test.js  # Concurrent inserts, deletes, 3-way merge
    └── disconnection.test.js       # Mid-edit drop, zombie awareness, room teardown

client/src/
├── hooks/useCollaborationStatus.js          # WS health monitor, exponential back-off
└── components/collaboration/
    ├── CollaborativeEditor.jsx              # Main editor — Yjs + Lexical + fallback
    ├── CollaborativeEditor.module.css       # Layout, toolbar, avatars, cursors, fallback
    ├── EditorToolbar.jsx                    # Bold/italic/underline/lists/link/undo/redo
    ├── PresenceOverlay.jsx                  # Avatar strip + remote cursor carets
    └── __tests__/
        ├── CollaborativeEditor.test.jsx     # Connected/failed/unsupported states
        └── PresenceOverlay.test.jsx         # Avatar count, overflow badge, cursors
```

### Modified files
| File | Change |
|------|--------|
| `server/server.js` | Refactored from `app.listen()` to `http.createServer(app)` so the WS server shares port 5000 |
| `server/package.json` | Added `yjs`, `y-websocket`, `ws`, `jest` |
| `client/src/pages/dashboard/BookingDetailPage.jsx` | Static notes `<p>` replaced with `<CollaborativeEditor>` |
| `client/package.json` | Added `yjs`, `y-websocket`, `lexical`, all `@lexical/*` packages, `vitest`, `@testing-library/react` |
| `client/.env` | Added `VITE_WS_URL=ws://localhost:5000` |

### How the CRDT layer works

```
Browser A                    Server                     Browser B
─────────                    ──────                     ─────────
Y.Doc ──── WS upgrade ──▶  yjsServer.js              Y.Doc ──── WS upgrade ──▶ yjsServer.js
           (JWT + tenant)     │                                  (JWT + tenant)   │
                              ▼                                                   │
                         roomManager                                              │
                         (one Y.Doc per bookingId) ◀──────────────────────────────┘
                              │
                    y-protocols sync + awareness
                    (MSG_SYNC=0, MSG_AWARENESS=1)
                              │
                    presenceManager
                    (avatar/cursor broadcast MSG_PRESENCE=3)
                              │
                    Periodic + last-disconnect persist
                    → booking.notes (plain text, REST-compatible)
```

- Two clients typing simultaneously produce concurrent Yjs updates. The CRDT merges them deterministically — both insertions are always preserved, order is consistent across all peers.
- On the last client disconnect the document is saved to `booking.notes` via `findOneAndUpdate`, making it available to the REST API and fallback textarea immediately.
- The Awareness protocol broadcasts cursor anchor/focus and user metadata (name, email, deterministic colour derived from `userId`) to all room members.

### New WebSocket endpoint

```
ws://localhost:5000/collaboration/:bookingId?token=<JWT>
```

| Condition | Behaviour |
|-----------|-----------|
| Missing token | HTTP 401, socket destroyed |
| Invalid / expired JWT | HTTP 401, socket destroyed |
| Booking not found or wrong tenant | HTTP 403, socket destroyed |
| Valid — room exists | Client joins existing Y.Doc, receives sync step 1 + current awareness |
| Valid — room new | Y.Doc created, seeded from `booking.notes`, periodic persist timer started |

### Collaboration status values (`useCollaborationStatus`)

| Status | Meaning |
|--------|---------|
| `idle` | Hook mounted, no provider yet |
| `connecting` | Initial WebSocket handshake in progress |
| `connected` | Live and synced — editor is fully collaborative |
| `reconnecting` | Connection dropped, retrying (exp. back-off: 1s → 2s → 4s, max 8s) |
| `failed` | 3 retries exhausted — fallback textarea activates |
| `unsupported` | `WebSocket` not in browser — fallback activates immediately |

### New dependencies

**Server**
- `yjs` — CRDT library (shared data types, update encoding)
- `y-websocket` — y-protocols sync + awareness over WebSocket
- `ws` — low-level WebSocket server (required by y-websocket)
- `jest` *(dev)* — test runner for backend ESM tests

**Client**
- `yjs` — client-side Y.Doc
- `y-websocket` — `WebsocketProvider` connecting to the server room
- `lexical` + `@lexical/react` + `@lexical/rich-text` + `@lexical/list` + `@lexical/link` + `@lexical/selection` + `@lexical/utils` — rich-text editor
- `vitest` + `@testing-library/react` + `jsdom` *(dev)* — frontend test stack

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
┌──────────────────────────┐        ┌────────────────────────────────────────────┐
│   React 19 + Vite        │ ─────▶ │   Express 5 API Server                     │
│   client/:5173           │        │   server/:5000                             │
│                          │        │                                            │
│  Landing Page            │        │  /api/auth/*          JWT auth             │
│  Login / Register        │        │  /api/tenants/*       onboarding           │
│  Onboarding Wizard       │        │  /api/dashboard/*     stats                │
│  Dashboard Shell         │        │  /api/bookings/*      CRUD + calendar      │
│  Bookings Calendar/List  │        │  /api/billing/*       Stripe billing       │
│  Billing & Plans UI      │        │  ws://.../collab/*    Yjs CRDTs (Week 4)   │
│  Invoice History         │        │                                            │
│  Collaborative Notes     │        │  MongoDB (multi-tenant RBAC)               │
└──────────────────────────┘        └────────────────────────────────────────────┘
                                                  │
                                    ┌─────────────▼──────────┐
                                    │   Stripe               │
                                    │  Checkout Sessions     │
                                    │  Webhooks              │
                                    │  Customer Portal       │
                                    └────────────────────────┘
```

### Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, React Router 7, Axios, date-fns, lucide-react |
| Rich-text editor | Lexical + @lexical/react, @lexical/rich-text, @lexical/list, @lexical/link |
| Real-time sync | Yjs (CRDTs), y-websocket, WebSocket (ws) |
| Backend | Node.js, Express 5, ES Modules |
| Database | MongoDB 7 + Mongoose (multi-tenant RBAC) |
| Auth | JWT (access + refresh tokens), bcrypt (12 rounds) |
| Validation | Zod (server), envalid (.env), client-side mirrored validation |
| Payments | Stripe — Checkout, Webhooks, Customer Portal, Invoices |
| Security | Helmet, CORS, express-rate-limit, webhook signature verification |
| Testing | Jest (backend), Vitest + Testing Library (frontend) |
| DevOps | Docker Compose (MongoDB), nodemon |

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

### Week 4 — Real-Time Collaboration (CRDTs)
- Yjs CRDT documents per booking, synced over WebSocket (y-websocket)
- WebSocket server sharing port 5000 with the REST API via `http.createServer`
- JWT + tenant ownership check on every WebSocket upgrade
- Lexical rich-text editor with bold, italic, underline, strikethrough, lists, links, undo/redo
- Live avatar strip (up to 5 + overflow badge) showing all connected users
- Coloured remote cursor carets with name labels, deterministic colour per `userId`
- Cursors removed within the same event loop tick after disconnect — no zombie entries
- Yjs document persisted to `booking.notes` every 30 s and on last-client disconnect
- `useCollaborationStatus` hook — 3-attempt exponential back-off (1 s → 2 s → 4 s → fail)
- Fallback `<textarea>` with banner + "Try again" button when collaboration unavailable
- Fallback content synced back to Yjs when connectivity is restored
- Auto-save to REST (`PATCH /api/bookings/:id`) every 10 s independent of the Yjs layer
- Backend tests: conflict resolution (concurrent inserts, deletes, 3-way merge), disconnection edge cases
- Frontend tests: editor states (connected / failed / unsupported), presence overlay rendering

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
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (create in Stripe Dashboard > Products)
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

Edit `client/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_WS_URL=ws://localhost:5000
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
# Terminal 1 — Backend (REST API + WebSocket collaboration server)
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:5000 |
| Health | http://localhost:5000/health |
| Collaboration WS | ws://localhost:5000/collaboration/:bookingId |
| Mongo UI | http://localhost:8081 (optional) |

### Step 7 — Test real-time collaboration

1. Open two browser windows and log in as two different users (see test credentials below)
2. Navigate both to the same booking detail page (`/dashboard/bookings/:id`)
3. Type in the notes editor in one window — changes appear live in the other
4. Watch the avatar strip update as users join and leave
5. To test the fallback: open DevTools → Network → set WebSocket to "Blocked", refresh — the editor degrades to a textarea with a warning banner

### Running tests

```bash
# Backend tests (conflict resolution, disconnection, room/presence logic)
cd server && npm test

# Frontend tests (editor states, presence overlay)
cd client && npm test
```

---

## 🧪 Test Credentials
All test users have password: **`password123`**

| Tenant Slug | Email | Role |
|-------------|-------|------|
| `acme` | admin@acme.com | owner |
| `acme` | manager@acme.com | admin |
| `acme` | user@acme.com | member |
| `techstart` | ceo@techstart.com | owner |
| `techstart` | dev@techstart.com | member |
| `creative` | founder@creative.com | owner |
| `creative` | designer@creative.com | member |

---

## 📡 API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login, get tokens |
| POST | /api/auth/refresh | Rotate refresh token |
| POST | /api/auth/logout | Invalidate refresh token |
| GET | /api/auth/me | Get current user |

### Bookings
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/bookings | List (filter/paginate) |
| POST | /api/bookings | Create (idempotent) |
| GET | /api/bookings/stats | Aggregated stats |
| GET | /api/bookings/:id | Get single booking |
| PUT | /api/bookings/:id | Full update |
| PATCH | /api/bookings/:id/status | Status update only |
| DELETE | /api/bookings/:id | Delete booking |

### Billing (Week 3)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/billing/plans | — | List all plans |
| GET | /api/billing/status | ✓ | Current subscription status |
| GET | /api/billing/invoices | ✓ | Invoice history |
| POST | /api/billing/checkout | ✓ | Create Stripe Checkout session |
| POST | /api/billing/portal | ✓ | Open Stripe Customer Portal |
| POST | /api/billing/cancel | ✓ | Cancel subscription at period end |
| POST | /api/billing/reactivate | ✓ | Undo pending cancellation |
| POST | /api/billing/webhook | — | Stripe webhook (raw body) |

### Collaboration WebSocket (Week 4)
| Path | Auth | Description |
|------|------|-------------|
| `ws://.../collaboration/:bookingId?token=JWT` | Bearer JWT (query param) | Join booking collaboration room |

Binary message types over the WebSocket:

| Type | Value | Direction | Description |
|------|-------|-----------|-------------|
| `MSG_SYNC` | 0 | both | Yjs sync step 1 / step 2 / update |
| `MSG_AWARENESS` | 1 | both | Cursor + user state (Yjs Awareness protocol) |
| `MSG_AUTH_ERROR` | 2 | server→client | Sent before close on auth failure |
| `MSG_PRESENCE` | 3 | server→client | JSON presence broadcast (avatar strip updates) |

---

## 🔒 Security

| Protection | Implementation |
|------------|----------------|
| Tenant isolation | MongoDB RBAC — every query scoped to `tenantId` |
| Auth | JWT access tokens (1h) + refresh rotation (7d) |
| Passwords | bcrypt 12 rounds |
| WebSocket auth | JWT verified + booking tenant ownership checked on every upgrade |
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
│   ├── components/
│   │   ├── bookings/                    # BookingFormModal
│   │   └── collaboration/              # Week 4
│   │       ├── CollaborativeEditor.jsx  # Yjs + Lexical editor
│   │       ├── CollaborativeEditor.module.css
│   │       ├── EditorToolbar.jsx        # Formatting toolbar
│   │       ├── PresenceOverlay.jsx      # Avatars + cursor carets
│   │       └── __tests__/
│   ├── context/                         # AuthContext
│   ├── hooks/
│   │   ├── useBookings.js
│   │   └── useCollaborationStatus.js   # Week 4 — WS health + back-off
│   ├── pages/
│   │   ├── LandingPage
│   │   ├── LoginPage
│   │   ├── OnboardPage
│   │   └── dashboard/
│   │       ├── DashboardHome
│   │       ├── BookingsPage             # Calendar + list views
│   │       ├── BookingDetailPage        # + CollaborativeEditor (Week 4)
│   │       ├── BillingPage             # Plans + invoices (Week 3)
│   │       ├── DashboardUsers
│   │       └── DashboardSettings
│   ├── services/api.js                  # Axios + all API calls
│   └── utils/booking.utils.js          # Date helpers, calendar grid
│
├── server/src/
│   ├── collaboration/                   # Week 4
│   │   ├── roomManager.js              # Y.Doc lifecycle + persistence
│   │   ├── presenceManager.js          # User/cursor state per room
│   │   ├── yjsServer.js                # WebSocket server + auth
│   │   └── __tests__/                  # Jest test suite
│   ├── config/
│   │   ├── env.js
│   │   ├── database.js
│   │   └── stripe.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── booking.controller.js
│   │   ├── billing.controller.js
│   │   └── tenant.controller.js
│   ├── models/
│   │   ├── tenant.model.js
│   │   ├── user.model.js
│   │   ├── booking.model.js            # notes field used by Yjs persistence
│   │   └── billing.model.js
│   ├── routes/
│   ├── validators/
│   └── utils/
│
├── server.js                            # http.createServer + attachCollaborationServer
├── docker-compose.yml
├── postman-collection.json
└── README.md
```

---

*Paralax Lab Internship · Week 1–4 · Multi-Tenant SaaS Platform with Stripe Billing & Real-Time Collaboration*
