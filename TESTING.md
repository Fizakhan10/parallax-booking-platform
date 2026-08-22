# Testing Guide

Comprehensive testing documentation for the TenantHub platform.

## Table of Contents

- [Running Tests](#running-tests)
- [Backend Tests](#backend-tests)
- [Frontend Tests](#frontend-tests)
- [Integration Testing](#integration-testing)
- [Performance Testing](#performance-testing)
- [Manual Testing](#manual-testing)

---

## Running Tests

### Backend Tests

```bash
cd server
npm test
```

**Test Files:**
- `src/collaboration/__tests__/roomManager.test.js`
- `src/collaboration/__tests__/presenceManager.test.js`
- `src/collaboration/__tests__/conflictResolution.test.js`
- `src/collaboration/__tests__/disconnection.test.js`

### Frontend Tests

```bash
cd client
npm test
```

**Test Files:**
- `src/components/collaboration/__tests__/CollaborativeEditor.test.jsx`
- `src/components/collaboration/__tests__/PresenceOverlay.test.jsx`

---

## Backend Tests

### Collaboration Tests

#### Room Manager
Tests Y.Doc lifecycle management:
- ✓ Creates room and Y.Doc for booking
- ✓ Returns same Y.Doc instance for subsequent joins (singleton)
- ✓ Seeds Y.Doc from database on creation
- ✓ Persists Y.Doc to database
- ✓ Cleans up room after last client disconnect

#### Presence Manager
Tests user presence and cursor tracking:
- ✓ Adds user to room presence
- ✓ Removes user from room presence
- ✓ Updates cursor position for user
- ✓ Assigns deterministic color per userId
- ✓ Returns all users in room

#### Conflict Resolution
Tests CRDT merge behavior:
- ✓ Concurrent insertions at same position preserved
- ✓ Concurrent deletions merged deterministically
- ✓ 3-way concurrent edits all preserved
- ✓ Order consistency across all clients

#### Disconnection Edge Cases
Tests cleanup and recovery:
- ✓ User disconnect removes from presence
- ✓ Last user disconnect triggers Y.Doc persist
- ✓ Room cleanup after timeout
- ✓ No zombie awareness entries

---

## Frontend Tests

### CollaborativeEditor Tests

Tests editor states and transitions:
- ✓ Renders Lexical editor when connected
- ✓ Shows fallback textarea on connection failure
- ✓ Displays retry button in failed state
- ✓ Shows unsupported message when WebSocket unavailable

### PresenceOverlay Tests

Tests presence rendering:
- ✓ Renders avatars for connected users
- ✓ Shows overflow badge when >5 users
- ✓ Renders remote cursor carets
- ✓ Applies correct colors to cursors

---

## Integration Testing

### Authentication Flow

```bash
# Manual test sequence
1. POST /api/auth/register
   Body: { tenantSlug, email, password, fullName }
   Expected: 201, { user, accessToken }

2. POST /api/auth/login
   Body: { tenantSlug, email, password }
   Expected: 200, { user, accessToken }
   Cookies: refreshToken (HttpOnly)

3. GET /api/auth/me
   Headers: Authorization: Bearer <token>
   Expected: 200, { user }

4. POST /api/auth/refresh
   Cookies: refreshToken
   Expected: 200, { accessToken }

5. POST /api/auth/logout
   Expected: 200, refreshToken invalidated
```

### Booking CRUD

```bash
# Create booking (test idempotency)
POST /api/bookings
Body: {
  "title": "Test Booking",
  "clientName": "John Doe",
  "clientEmail": "john@example.com",
  "startTime": "2026-09-01T10:00:00Z",
  "endTime": "2026-09-01T11:00:00Z",
  "serviceType": "Consultation",
  "status": "pending",
  "idempotencyKey": "unique-uuid-here"
}

# Retry with same idempotencyKey
# Expected: Same booking returned, no duplicate created

# List bookings
GET /api/bookings?status=pending&month=2026-09

# Update booking
PUT /api/bookings/:id
Body: { title, clientName, ... }

# Delete booking
DELETE /api/bookings/:id
Expected: 200, booking removed
```

### Real-Time Collaboration

```bash
# Test Steps:
1. Open two browser windows
2. Login as different users in each
3. Navigate both to same booking detail page
4. Type in notes editor in window 1
   → Changes appear in window 2 (< 100ms latency)
5. Move cursor in window 1
   → Cursor appears in window 2
6. Disconnect window 1
   → Avatar removed from window 2
7. Reconnect window 1
   → Avatar reappears in window 2
```

### Stripe Billing

```bash
# Test checkout flow
1. POST /api/billing/checkout
   Body: { priceId: "price_starter" }
   Expected: { sessionId, url }

2. Complete payment on Stripe Hosted Page
   → Webhook received: checkout.session.completed

3. GET /api/billing/status
   Expected: { plan: "starter", status: "active" }

4. GET /api/billing/invoices
   Expected: Array of invoice objects

5. POST /api/billing/cancel
   Expected: { cancelAt: <date> }

6. POST /api/billing/reactivate
   Expected: { status: "active", cancelAt: null }
```

---

## Performance Testing

### Database Migration Performance

Test zero-downtime migration with 100k rows:

```bash
# 1. Seed large dataset
cd server
npm run db:seed:large
# Expected: ~45 seconds, 2200 docs/sec

# 2. Measure query performance BEFORE migration
node -e "
const Booking = require('./src/models/booking.model.js');
const mongoose = require('mongoose');
await mongoose.connect(process.env.MONGODB_URI);

const start = Date.now();
await Booking.find({ 
  tenantId: 'your-tenant-id',
  status: 'confirmed' 
}).sort({ startTime: -1 }).limit(50);
console.log('Query time WITHOUT indexes:', Date.now() - start, 'ms');
// Expected: 500-1000ms

await mongoose.disconnect();
"

# 3. Run migration
npm run migrate:up
# Expected: 2-3 minutes, background mode

# 4. Measure query performance AFTER migration
# Re-run query from step 2
# Expected: <50ms (10-20x improvement)
```

### API Load Testing

Using Apache Bench:

```bash
# Health endpoint
ab -n 1000 -c 10 http://localhost:5000/health
# Expected: <20ms avg response time

# Bookings list (authenticated)
ab -n 500 -c 10 -H "Authorization: Bearer <token>" \
   http://localhost:5000/api/bookings
# Expected: <100ms avg response time (with indexes)
```

Using Artillery:

```bash
npm install -g artillery

# Create test config (artillery.yml)
cat > artillery.yml << 'EOF'
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: Warm up
    - duration: 120
      arrivalRate: 50
      name: Sustained load
scenarios:
  - name: List bookings
    flow:
      - post:
          url: "/api/auth/login"
          json:
            tenantSlug: "acme"
            email: "admin@acme.com"
            password: "password123"
          capture:
            json: "$.accessToken"
            as: "token"
      - get:
          url: "/api/bookings"
          headers:
            Authorization: "Bearer {{ token }}"
EOF

artillery run artillery.yml
```

### WebSocket Load Testing

```bash
# Install wscat
npm install -g wscat

# Connect to collaboration endpoint
wscat -c "ws://localhost:5000/collaboration/<bookingId>?token=<jwt>"

# Send Yjs sync message (binary)
# Monitor latency in DevTools Network tab
# Expected: <50ms message propagation
```

---

## Manual Testing

### Responsive Design Audit

Test on multiple viewports:

**Desktop (1920x1080):**
- ✓ Dashboard sidebar expanded
- ✓ Calendar shows month view
- ✓ Booking modal full width
- ✓ Collaboration editor toolbar visible

**Tablet (768x1024):**
- ✓ Dashboard sidebar collapsible
- ✓ Calendar responsive grid
- ✓ Booking modal adjusted
- ✓ Touch-friendly controls

**Mobile (375x667):**
- ✓ Dashboard sidebar hidden (hamburger menu)
- ✓ Calendar switches to list view
- ✓ Booking modal full-screen
- ✓ Collaboration editor toolbar stacked

### Error Page Testing

**404 Page:**
```
Navigate to: http://localhost:5173/nonexistent-route
Expected:
- Custom 404 page displayed
- "Go Back" and "Go to Dashboard" buttons functional
- Responsive on mobile
```

**500 Page:**
```
Trigger by:
- Stopping backend server
- Making API request from frontend
Expected:
- Error boundary catches error
- Custom 500 page displayed
- "Reload Page" button functional
```

### Empty State Testing

**No Bookings:**
```
1. Login to new tenant
2. Navigate to bookings page
Expected:
- EmptyState component rendered
- Calendar icon displayed
- "Create your first booking" message
- "New Booking" CTA button
```

**No Invoices:**
```
1. Login to free plan tenant
2. Navigate to billing page
Expected:
- Empty state for invoices section
- "Upgrade to view invoices" message
```

### Cache Fallback Testing

**Redis Active:**
```
1. Start all services: docker-compose up -d
2. Navigate to settings page
3. Open browser DevTools → Network
4. Observe: Banner shows "⚡ Active (Redis Cache)"
5. Update setting
6. Observe: Cache invalidated, new value loaded
```

**Redis Down:**
```
1. Stop Redis: docker-compose stop redis
2. Refresh settings page
3. Observe: Banner shows "🗄️ Fallback (MongoDB)"
4. Update setting
5. Observe: Still functional, writes to MongoDB
6. Start Redis: docker-compose start redis
7. Refresh page
8. Observe: Banner returns to "⚡ Active (Redis Cache)"
```

### Collaboration Fallback Testing

**WebSocket Unavailable:**
```
1. Open booking detail page
2. DevTools → Network → Block WebSocket connections
3. Refresh page
4. Expected:
   - Fallback textarea displayed
   - Warning banner: "Collaboration unavailable"
   - "Try again" button visible
5. Unblock WebSocket
6. Click "Try again"
7. Expected: Collaborative editor loads
```

---

## CI/CD Pipeline (Future)

Suggested GitHub Actions workflow:

```yaml
name: Test & Deploy

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
      redis:
        image: redis:alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - name: Install dependencies
        run: |
          cd server && npm ci
          cd ../client && npm ci
      - name: Run backend tests
        run: cd server && npm test
      - name: Run frontend tests
        run: cd client && npm test
      - name: Build production
        run: cd client && npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: echo "Deploy steps here"
```

---

## Test Coverage Goals

**Backend:**
- Controllers: 80%+
- Models: 90%+
- Middleware: 85%+
- Utilities: 90%+

**Frontend:**
- Components: 70%+
- Hooks: 80%+
- Services: 85%+

**Integration:**
- Critical paths: 100%
- Auth flow: 100%
- Booking CRUD: 100%
- Billing flow: 100%

---

## Troubleshooting Tests

### Backend Tests Fail

```bash
# Ensure MongoDB is running
docker-compose up -d mongo

# Check MongoDB connection
mongosh mongodb://localhost:27017/multitenant_saas

# Clear test database
mongosh --eval "use multitenant_saas; db.dropDatabase();"

# Re-run tests
cd server && npm test
```

### Frontend Tests Fail

```bash
# Clear node_modules and reinstall
cd client
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Re-run tests
npm test
```

### WebSocket Tests Fail

```bash
# Check if port 5000 is available
netstat -an | grep 5000

# Ensure backend is running
cd server && npm run dev

# Test WebSocket connection
wscat -c ws://localhost:5000/collaboration/test?token=<jwt>
```

---

For questions or issues, consult the main README.md or open a GitHub issue.
