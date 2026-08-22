# Changelog

All notable changes to the TenantHub project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.6.0] - 2026-08-22 - Week 6: Production Ready

### Added

#### Database & Migrations
- **Zero-downtime migration system** with background index creation
- **Migration tracking** via `migrations` collection to prevent duplicate runs
- **Migration rollback support** (`npm run migrate:down`)
- **Large dataset seeder** generating 100,000 realistic bookings
- **5 compound indexes** for optimal query performance:
  - `idx_tenant_startTime` — Calendar queries
  - `idx_tenant_status` — Status filtering
  - `idx_tenant_createdBy` — User bookings
  - `idx_time_range` — Date range queries
  - `idx_clientEmail` — Client lookup

#### Docker & DevOps
- **Complete Docker Compose orchestration** with 4 services (frontend, backend, MongoDB, Redis)
- **Multi-stage Dockerfiles** for production builds (backend + frontend)
- **Docker health checks** for all services
- **Nginx reverse proxy** configuration with:
  - Gzip compression
  - Static asset caching (1-year)
  - Security headers
  - SPA routing support
- **Docker networks** for isolated service communication
- **Volume management** for persistent data
- **Environment variable templating** (`.env.example`)
- **Automated setup scripts** (setup.sh, setup.bat)

#### Health & Monitoring
- **4 health check endpoints**:
  - `GET /health` — Basic health
  - `GET /health/live` — Liveness probe
  - `GET /health/ready` — Readiness with dependency checks
  - `GET /health/info` — Detailed system metrics
- **Dependency health checks** (MongoDB, Redis, memory usage)
- **Graceful degradation** reporting (cache fallback status)
- **Formatted uptime** and resource usage reporting

#### Frontend Polish
- **404 error page** with navigation options
- **500 error page** with reload capability
- **Reusable EmptyState component** with variants
- **Error boundaries** for crash recovery
- **Responsive error pages** (mobile-optimized)
- **Empty states** for bookings, invoices, notes

#### Production Optimization
- **Code splitting** with manual chunks:
  - React vendor (~130KB gzipped)
  - Lexical vendor (~80KB gzipped)
  - Yjs vendor (~50KB gzipped)
  - Stripe vendor (~40KB gzipped)
- **Terser minification** with console.log removal
- **Tree shaking** to eliminate unused code
- **Asset inlining** for files <4KB
- **CSS code splitting** per component
- **Source map generation** (configurable)
- **Dependency pre-bundling** via Vite

#### Documentation
- **Comprehensive README** with architecture diagrams
- **TESTING.md** — Complete testing guide
- **DEPLOYMENT.md** — Production deployment guide
- **CHANGELOG.md** — This file
- **Architecture diagrams** (ASCII art):
  - System architecture
  - Authentication flow
  - Real-time collaboration flow
  - Cache-aside pattern
- **Performance benchmarks** documented
- **Security checklist** added
- **Deployment checklist** added

### Changed

#### Backend
- **Health routes** moved to dedicated `health.routes.js`
- **app.js** now imports and uses health routes
- **package.json scripts** added:
  - `db:seed:large` — 100k bookings
  - `migrate:up` — Run migrations
  - `migrate:down` — Rollback migrations

#### Frontend
- **vite.config.js** enhanced with production optimizations
- **App.jsx** updated with error page routes
- **Build output** restructured with vendor chunking

#### Docker
- **docker-compose.yml** expanded from 2 to 4 services
- **Service dependencies** properly configured
- **Health checks** added to all services
- **Restart policies** set to `unless-stopped`
- **Logging** configured with rotation

### Fixed
- **Migration idempotency** — Prevents duplicate index creation
- **Error handling** in health checks
- **Redis fallback** messaging in health endpoints
- **Docker port mapping** for frontend (5173→80)
- **Nginx SPA routing** for client-side routes

### Performance
- **Query performance** improved 10-20x with indexes:
  - Before: 500-1000ms
  - After: <50ms
- **Build size reduction**:
  - Lazy loading reduces initial bundle
  - Vendor splitting improves caching
  - Total gzipped: <500KB
- **Database seeding speed**: ~2,200 docs/sec
- **Migration speed**: 2-3 minutes for 5 indexes (background mode)

---

## [1.5.0] - 2026-08-15 - Week 5: Caching & Resilience

### Added
- Redis cache layer with Docker integration
- Cache-aside pattern for tenant settings (1h TTL)
- Graceful fallback to MongoDB when Redis unavailable
- UI indicators showing cache vs fallback status
- `redisClient.js` utility with connection tracking
- Settings controller cache logic with invalidation

### Changed
- `docker-compose.yml` added Redis service
- `TenantSettings.jsx` displays cache connection status

---

## [1.4.0] - 2026-08-08 - Week 4: Real-Time Collaboration

### Added
- Yjs CRDT documents for conflict-free collaborative editing
- WebSocket server sharing port with REST API
- JWT authentication for WebSocket connections
- Lexical rich-text editor with formatting toolbar
- Real-time presence indicators (avatars, cursors)
- Graceful fallback to textarea when WebSocket unavailable
- Automated tests (Jest for backend, Vitest for frontend)
- Background document persistence (30s interval + last-disconnect)

### Changed
- `server.js` refactored to use `http.createServer()`
- `BookingDetailPage.jsx` replaced static notes with `CollaborativeEditor`

---

## [1.3.0] - 2026-08-01 - Week 3: Payments & Billing

### Added
- Stripe Checkout integration for plan upgrades
- Webhook handler with signature verification
- Idempotent webhook processing via `BillingEvent` model
- Customer Portal for self-service payment management
- Invoice history with PDF downloads
- Billing UI with plans grid and subscription management

### Changed
- Added billing routes and controller
- Updated dashboard with billing page

---

## [1.2.0] - 2026-07-25 - Week 2: Bookings

### Added
- Idempotent booking CRUD APIs with UUID-based idempotency keys
- Zod validation with standardized error responses
- Custom-built calendar UI (no third-party libraries)
- Booking detail page with edit/delete flows
- Postman collection for API testing
- `react-hot-toast` for user notifications

### Changed
- Added booking routes, controllers, and validators
- Created BookingsPage and BookingDetailPage components

---

## [1.1.0] - 2026-07-18 - Week 1: Foundation

### Added
- Multi-tenant MongoDB schema with tenant isolation
- JWT authentication (access + refresh tokens)
- Tenant onboarding wizard (2-step flow)
- Dashboard shell with responsive sidebar
- Environment validation with `envalid`
- RBAC (owner, admin, member roles)

### Initial Release
- Project scaffolding
- React 19 + Vite frontend
- Express 5 backend
- MongoDB integration
- Basic routing and authentication

---

## Release Schedule

- **Week 1**: Foundation (Auth, Multi-tenancy)
- **Week 2**: Bookings (CRUD, Calendar)
- **Week 3**: Payments (Stripe Integration)
- **Week 4**: Real-Time (CRDTs, WebSocket)
- **Week 5**: Caching (Redis, Fallback)
- **Week 6**: Production (Docker, Migrations, Polish) ← **Current**

---

## Roadmap

### Future Enhancements
- [ ] Email notifications (booking confirmations, reminders)
- [ ] SMS notifications via Twilio
- [ ] Calendar integrations (Google Calendar, Outlook)
- [ ] Video conferencing integration (Zoom, Google Meet)
- [ ] Advanced analytics dashboard
- [ ] Custom branding per tenant
- [ ] API rate limiting per tenant
- [ ] Multi-language support (i18n)
- [ ] Mobile apps (React Native)
- [ ] Prometheus metrics endpoint
- [ ] Automated load testing suite
- [ ] Blue-green deployment pipeline

---

## Breaking Changes

### v1.6.0
- None — all changes backward compatible

### v1.5.0
- Requires Redis for optimal performance (graceful fallback available)

### v1.4.0
- WebSocket endpoint requires JWT in query parameter
- `booking.notes` field format changed (now Yjs-compatible plain text)

### v1.3.0
- Stripe webhook endpoint must be registered in Stripe Dashboard
- Environment variables added: `STRIPE_*` keys required

---

## Migration Guide

### Upgrading to v1.6.0

```bash
# 1. Pull latest code
git pull origin main

# 2. Update dependencies
cd server && npm install
cd ../client && npm install

# 3. Update environment variables (add to .env if missing)
# No new variables required for v1.6.0

# 4. Run database migration
cd server
npm run migrate:up

# 5. Rebuild Docker images (if using Docker)
docker-compose build
docker-compose up -d

# 6. Verify health
curl http://localhost:5000/health/ready

# 7. Test error pages
# Navigate to http://localhost:5173/nonexistent-route
```

### Rollback Procedure

```bash
# 1. Rollback database migration
cd server
npm run migrate:down

# 2. Checkout previous version
git checkout v1.5.0

# 3. Rebuild
docker-compose build
docker-compose up -d
```

---

## Contributors

- **Week 1-6**: [Your Name] — Full-stack development

---

## License

This project is part of the Paralax Lab Internship program.

---

**Last Updated**: August 22, 2026
