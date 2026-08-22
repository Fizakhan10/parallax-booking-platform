# TenantHub Architecture

Visual architecture and data flow documentation.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              TenantHub                                  │
│                   Multi-Tenant SaaS Booking Platform                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Browser   │ ───▶ │   Nginx     │ ───▶ │   React     │
│  (Client)   │      │ (Reverse    │      │   (SPA)     │
│             │      │  Proxy)     │      │   Port      │
│             │      │   Port 80   │      │   5173      │
└─────────────┘      └─────────────┘      └─────────────┘
       │                    │
       │                    ▼
       │             ┌─────────────┐
       │             │   Express   │
       │             │   (API)     │
       └────────────▶│   Port      │
         WebSocket   │   5000      │
                     └─────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   MongoDB    │    │    Redis     │    │    Stripe    │
│   Database   │    │    Cache     │    │   Payments   │
│   Port       │    │    Port      │    │   (Cloud)    │
│   27017      │    │    6379      │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## Service Architecture

### Frontend (Client)

```
┌─────────────────────────────────────────────────────────────┐
│                        React 19 SPA                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Landing    │  │    Auth      │  │  Onboarding  │    │
│  │     Page     │  │  Login/Reg   │  │    Wizard    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Dashboard                          │  │
│  │  ┌────────┐  ┌─────────┐  ┌────────┐  ┌─────────┐ │  │
│  │  │ Home   │  │Bookings │  │Billing │  │Settings │ │  │
│  │  └────────┘  └─────────┘  └────────┘  └─────────┘ │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────┐                │  │
│  │  │  Collaborative Editor (Yjs)    │                │  │
│  │  │  • Real-time sync              │                │  │
│  │  │  • Presence indicators         │                │  │
│  │  │  • Cursor tracking             │                │  │
│  │  └────────────────────────────────┘                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Tech: React 19, Vite, React Router, Axios, Lexical, Yjs  │
│  Build: Code splitting, tree shaking, minification        │
│  Size: <500KB gzipped                                      │
└─────────────────────────────────────────────────────────────┘
```

### Backend (Server)

```
┌─────────────────────────────────────────────────────────────┐
│                    Express 5 API Server                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────── REST API ──────────────────────┐    │
│  │                                                     │    │
│  │  /api/auth/*       │  JWT authentication           │    │
│  │  /api/tenants/*    │  Tenant management            │    │
│  │  /api/bookings/*   │  Booking CRUD                 │    │
│  │  /api/billing/*    │  Stripe integration          │    │
│  │  /health/*         │  Health checks                │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────── WebSocket Server ────────────────┐        │
│  │                                                 │        │
│  │  /collaboration/:bookingId                     │        │
│  │                                                 │        │
│  │  • Yjs CRDT sync                               │        │
│  │  • Presence awareness                          │        │
│  │  • JWT authentication                          │        │
│  │                                                 │        │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
│  ┌─────────────── Middleware ──────────────────┐          │
│  │                                               │          │
│  │  • Helmet (Security headers)                 │          │
│  │  • CORS (Origin whitelist)                   │          │
│  │  • Rate limiting (200/15min)                 │          │
│  │  • Auth verification (JWT)                   │          │
│  │  • Tenant isolation (tenantId filter)        │          │
│  │  • Error handling                            │          │
│  │                                               │          │
│  └───────────────────────────────────────────────┘          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Tech: Node.js, Express 5, Mongoose, Yjs, Stripe, Redis   │
│  Security: JWT, bcrypt (12 rounds), Helmet, Rate limiting │
└─────────────────────────────────────────────────────────────┘
```

### Data Layer

```
┌─────────────────────────────────────────────────────────────┐
│                         MongoDB                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Collections:                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   tenants    │  │    users     │  │   bookings   │    │
│  │              │  │              │  │              │    │
│  │  • name      │  │  • email     │  │  • title     │    │
│  │  • slug      │  │  • password  │  │  • client    │    │
│  │  • plan      │  │  • role      │  │  • times     │    │
│  │  • settings  │  │  • tenantId  │  │  • status    │    │
│  └──────────────┘  └──────────────┘  │  • notes     │    │
│                                       │  • tenantId  │    │
│  ┌──────────────┐  ┌──────────────┐  └──────────────┘    │
│  │   billing    │  │  migrations  │                       │
│  │              │  │              │                       │
│  │  • stripeId  │  │  • name      │  Indexes:            │
│  │  • plan      │  │  • status    │  • tenantId +        │
│  │  • status    │  │  • date      │    startTime         │
│  │  • invoices  │  │              │  • tenantId +        │
│  └──────────────┘  └──────────────┘    status            │
│                                       • tenantId +        │
│                                         createdBy         │
├─────────────────────────────────────────────────────────────┤
│  Tenant Isolation: All queries filtered by tenantId       │
│  Performance: Compound indexes on frequent queries        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                          Redis                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Cache Strategy: Cache-aside pattern                        │
│                                                             │
│  Cached Data:                                               │
│  • Tenant settings (1h TTL)                                │
│  • Booking lists (5min TTL)                                │
│                                                             │
│  Invalidation:                                              │
│  • On data mutation (update, delete)                       │
│                                                             │
│  Fallback:                                                  │
│  • Graceful degradation to MongoDB                         │
│  • No service disruption                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Authentication Flow

```
User                  Frontend              Backend              MongoDB
 │                       │                     │                    │
 │──1. Enter creds──────▶│                     │                    │
 │                       │──2. POST /login────▶│                    │
 │                       │   { email, pwd }    │                    │
 │                       │                     │──3. Query user────▶│
 │                       │                     │◀─4. User doc───────│
 │                       │                     │                    │
 │                       │                     │  5. Verify pwd     │
 │                       │                     │  6. Generate JWT   │
 │                       │                     │                    │
 │                       │◀─7. { accessToken,  │                    │
 │◀─8. Store token───────│      refreshToken } │                    │
 │     (localStorage)    │   (HttpOnly cookie) │                    │
 │                       │                     │                    │
 │──9. API request──────▶│──10. GET /bookings─▶│                    │
 │   (with token)        │   Authorization:    │                    │
 │                       │   Bearer <token>    │  11. Verify JWT    │
 │                       │                     │  12. Extract       │
 │                       │                     │      tenantId      │
 │                       │                     │                    │
 │                       │                     │──13. Query docs───▶│
 │                       │                     │   (tenantId filter)│
 │                       │◀─14. Bookings JSON──│◀────────────────  │
 │◀─15. Display data─────│                     │                    │
```

### 2. Real-Time Collaboration Flow

```
Browser A             Server (Yjs)           Browser B           MongoDB
   │                       │                       │                │
   │──1. WS connect───────▶│                       │                │
   │   ?token=JWT          │                       │                │
   │                       │ 2. Verify JWT         │                │
   │                       │    Check tenant       │                │
   │                       │                       │                │
   │◀─3. Connected─────────│──4. Query notes──────▶                │
   │   Y.Doc synced        │◀─5. notes content─────│                │
   │                       │                       │                │
   │                       │◀─6. WS connect────────│                │
   │                       │   ?token=JWT          │                │
   │                       │                       │                │
   │◀──7. User joined──────│──8. User joined──────▶                │
   │   (presence)          │   (presence)          │                │
   │                       │                       │                │
   │──9. Text edit────────▶│                       │                │
   │   (Yjs update)        │──10. Broadcast───────▶                │
   │                       │    (Yjs update)       │                │
   │                       │                       │                │
   │◀─11. Cursor pos───────│◀─12. Cursor move──────│                │
   │                       │                       │                │
   │                       │  13. Auto-persist     │                │
   │                       │      (every 30s)      │                │
   │                       │──────────────────────▶                │
   │                       │   UPDATE booking      │                │
   │                       │   SET notes = ...     │                │
```

### 3. Stripe Billing Flow

```
User               Frontend         Backend          Stripe           MongoDB
 │                    │                │                │                │
 │──1. Click plan────▶│                │                │                │
 │                    │──2. POST /     │                │                │
 │                    │   checkout ───▶│                │                │
 │                    │                │──3. Create ───▶                │
 │                    │                │   session      │                │
 │                    │                │◀─4. sessionId──│                │
 │                    │◀─5. { url }────│                │                │
 │                    │                │                │                │
 │──6. Redirect──────────────────────────────────────▶                │
 │   to Stripe Hosted Checkout                        │                │
 │                                                     │                │
 │──7. Enter payment──────────────────────────────────▶                │
 │                                                     │                │
 │                    │                │◀─8. Webhook───│                │
 │                    │                │   checkout.   │                │
 │                    │                │   completed   │                │
 │                    │                │                │                │
 │                    │                │  9. Verify    │                │
 │                    │                │     signature │                │
 │                    │                │                │                │
 │                    │                │ 10. Process   │                │
 │                    │                │     event     │                │
 │                    │                │                │                │
 │                    │                │────────────────────11. Update──▶
 │                    │                │                │   subscription │
 │                    │                │                │   status       │
 │                    │                │                │                │
 │◀─12. Redirect back│                │                │                │
 │   to dashboard     │                │                │                │
 │   (plan updated)   │                │                │                │
```

### 4. Cache-Aside Pattern

```
Client            API Server           Redis            MongoDB
  │                   │                  │                 │
  │──1. GET /────────▶│                  │                 │
  │   settings        │                  │                 │
  │                   │──2. Check cache─▶│                 │
  │                   │◀─3. MISS─────────│                 │
  │                   │                  │                 │
  │                   │──4. Query DB────────────────────  │
  │                   │◀─5. Settings doc─────────────────│ │
  │                   │                  │                 │
  │                   │──6. Set cache───▶│                 │
  │                   │   (TTL: 1h)      │                 │
  │◀─7. Response──────│                  │                 │
  │                   │                  │                 │
  │──8. UPDATE /─────▶│                  │                 │
  │   settings        │                  │                 │
  │                   │──9. Invalidate──▶│                 │
  │                   │   cache          │                 │
  │                   │                  │                 │
  │                   │──10. Update DB──────────────────  │
  │                   │                  │                 │
  │◀─11. Success──────│                  │                 │
  │                   │                  │                 │
  │──12. GET /───────▶│                  │                 │
  │   settings        │──13. Check cache▶│                 │
  │                   │◀─14. MISS────────│                 │
  │                   │                  │                 │
  │                   │──15. Query DB───────────────────  │
  │                   │◀─16. Updated doc─────────────────│ │
  │                   │                  │                 │
  │                   │──17. Set cache──▶│                 │
  │◀─18. Response─────│                  │                 │
```

---

## Deployment Architecture

### Docker Compose (Development/Small Production)

```
┌──────────────────────────────────────────────────────────┐
│                    Host Machine                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Docker Network (bridge)               │ │
│  │                                                    │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │ │
│  │  │ Frontend │  │ Backend  │  │  MongoDB │       │ │
│  │  │  (Nginx) │  │ (Node.js)│  │          │       │ │
│  │  │  Port 80 │  │ Port 5000│  │Port 27017│       │ │
│  │  └─────┬────┘  └─────┬────┘  └─────┬────┘       │ │
│  │        │             │              │            │ │
│  │  ┌─────┴──────┐  ┌───┴───┐    ┌────┴─────┐     │ │
│  │  │   Redis    │  │ Logs  │    │ Volumes  │     │ │
│  │  │ Port 6379  │  │       │    │ (persist)│     │ │
│  │  └────────────┘  └───────┘    └──────────┘     │ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
└──────────────────────────────────────────────────────────┘
         │              │              │
         │              │              │
    Port 5173      Port 5000     Port 27017
    (Frontend)     (Backend)     (MongoDB)
```

### Kubernetes (Scalable Production)

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────── Ingress Controller ──────────────┐        │
│  │  (NGINX / Load Balancer)                       │        │
│  │  • SSL termination                             │        │
│  │  • Path-based routing                          │        │
│  └──┬────────────────────────────────────┬────────┘        │
│     │                                    │                 │
│     ▼                                    ▼                 │
│  ┌──────────────────┐            ┌──────────────────┐     │
│  │  Frontend Pods   │            │  Backend Pods    │     │
│  │  (Replicas: 2)   │            │  (Replicas: 3)   │     │
│  │                  │            │                  │     │
│  │  ┌────┐  ┌────┐ │            │  ┌────┐  ┌────┐ │     │
│  │  │Pod1│  │Pod2│ │            │  │Pod1│  │Pod2│ │     │
│  │  └────┘  └────┘ │            │  └────┘  └────┘ │     │
│  │                  │            │      ┌────┐     │     │
│  │  Port: 80        │            │      │Pod3│     │     │
│  └──────────────────┘            │      └────┘     │     │
│                                  │                  │     │
│                                  │  Port: 5000      │     │
│                                  └──────┬───────────┘     │
│                                         │                 │
│         ┌──────────────────────┬────────┴──────┐         │
│         │                      │               │         │
│         ▼                      ▼               ▼         │
│  ┌─────────────┐        ┌─────────────┐  ┌──────────┐  │
│  │  MongoDB    │        │   Redis     │  │  Stripe  │  │
│  │  StatefulSet│        │   Service   │  │  (Cloud) │  │
│  │             │        │             │  │          │  │
│  │  • Volume   │        │  • Single   │  │  Webhook │  │
│  │    claims   │        │    replica  │  │  handler │  │
│  └─────────────┘        └─────────────┘  └──────────┘  │
│                                                         │
│  ┌──────────────── Monitoring ──────────────────┐      │
│  │  • Prometheus (metrics)                      │      │
│  │  • Grafana (dashboards)                      │      │
│  │  • Loki (logs)                               │      │
│  └──────────────────────────────────────────────┘      │
│                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Security Layers                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: Network Security                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • Firewall rules (allow only 80, 443)             │   │
│  │  • DDoS protection (Cloudflare, AWS Shield)        │   │
│  │  • VPC isolation                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Layer 2: Transport Security                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • TLS 1.2+ (Let's Encrypt certificates)           │   │
│  │  • HSTS headers (force HTTPS)                      │   │
│  │  • Secure WebSocket (wss://)                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Layer 3: Application Security                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • Helmet.js (security headers)                     │   │
│  │  • CORS (origin whitelist)                          │   │
│  │  • Rate limiting (200 req/15min)                    │   │
│  │  • Input validation (Zod schemas)                   │   │
│  │  • XSS prevention (React escaping)                  │   │
│  │  • CSRF protection (SameSite cookies)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Layer 4: Authentication & Authorization                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • JWT (short expiry: 1h access, 7d refresh)       │   │
│  │  • bcrypt (12 rounds) for passwords                 │   │
│  │  • Secure, HttpOnly cookies                         │   │
│  │  • RBAC (owner, admin, member)                      │   │
│  │  • Tenant isolation (tenantId filter)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Layer 5: Data Security                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • Encryption at rest (MongoDB, AWS EBS)            │   │
│  │  • Encryption in transit (TLS)                      │   │
│  │  • Parameterized queries (injection prevention)     │   │
│  │  • Regular backups (30-day retention)               │   │
│  │  • Audit logs                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Layer 6: Payment Security                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • PCI-DSS compliant (Stripe Hosted Checkout)       │   │
│  │  • Webhook signature verification                   │   │
│  │  • No card data stored locally                      │   │
│  │  • Idempotent webhook processing                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────┐
│                  Performance Strategies                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend Optimization                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • Code splitting (vendor chunks)                   │   │
│  │  • Tree shaking (remove unused code)                │   │
│  │  • Minification (Terser)                            │   │
│  │  • Lazy loading (routes, components)                │   │
│  │  • Asset optimization (images, fonts)               │   │
│  │  • CDN distribution                                 │   │
│  │  • Browser caching (1 year for static)              │   │
│  │  • Gzip compression                                 │   │
│  │                                                      │   │
│  │  Result: <500KB gzipped, <2.5s TTI                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Backend Optimization                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • Connection pooling (MongoDB: 10, Redis: 5)       │   │
│  │  • Query optimization (compound indexes)            │   │
│  │  • Lean queries (project only needed fields)        │   │
│  │  • Response caching (Redis)                         │   │
│  │  • Async/await (non-blocking I/O)                   │   │
│  │  • Rate limiting (prevent abuse)                    │   │
│  │                                                      │   │
│  │  Result: <100ms API response time                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Database Optimization                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • Compound indexes (5 indexes on bookings)         │   │
│  │  • Background index creation (zero-downtime)        │   │
│  │  • Lean documents (exclude unnecessary fields)      │   │
│  │  • Aggregation pipelines (efficient grouping)       │   │
│  │  • Read preference (secondary for reads)            │   │
│  │                                                      │   │
│  │  Result: 10-20x query improvement (1000ms → 50ms)   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Cache Strategy                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • Cache-aside pattern                              │   │
│  │  • TTL: 1h for settings, 5min for lists            │   │
│  │  • Invalidation on mutation                         │   │
│  │  • Graceful fallback to MongoDB                     │   │
│  │                                                      │   │
│  │  Result: 90% cache hit rate, <10ms response         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

For implementation details, see:
- [README.md](./README.md) — Full documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Production deployment
- [TESTING.md](./TESTING.md) — Testing strategies
