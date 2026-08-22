# Quick Start Guide

Get TenantHub running in 5 minutes.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+ installed
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed (recommended)
- Stripe account (free test mode)

---

## Option 1: Docker (Recommended) — 3 Steps

### Step 1: Clone & Configure

```bash
git clone https://github.com/yourusername/tenanthub.git
cd tenanthub

# Copy environment template
cp .env.example .env

# Edit .env with your secrets
# Minimum required: JWT secrets and Stripe keys
```

### Step 2: Start Services

```bash
docker-compose up -d --build
```

This starts:
- Frontend (React) on port 5173
- Backend (Express) on port 5000
- MongoDB on port 27017
- Redis on port 6379

### Step 3: Seed Database

```bash
docker-compose exec backend npm run db:seed
```

**Done!** Open http://localhost:5173

---

## Option 2: Manual Setup — 5 Steps

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/tenanthub.git
cd tenanthub
```

### Step 2: Install Dependencies

```bash
# Server
cd server && npm install

# Client
cd ../client && npm install
```

### Step 3: Configure Environment

**Server** (`server/.env`):
```env
MONGODB_URI=mongodb://localhost:27017/multitenant_saas
REDIS_URL=redis://localhost:6379

JWT_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
COOKIE_SECRET=your_cookie_secret_here

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

**Client** (`client/.env`):
```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Step 4: Start MongoDB & Redis

```bash
# Using Docker
docker-compose up -d mongo redis

# OR use your local instances
# MongoDB: localhost:27017
# Redis: localhost:6379
```

### Step 5: Start Development Servers

```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Client
cd client && npm run dev

# Terminal 3 - Seed database
cd server && npm run db:seed
```

**Done!** Open http://localhost:5173

---

## Test Login Credentials

All users have password: **`password123`**

| Tenant | Email | Role |
|--------|-------|------|
| acme | admin@acme.com | owner |
| acme | manager@acme.com | admin |
| acme | user@acme.com | member |
| techstart | ceo@techstart.com | owner |
| creative | founder@creative.com | owner |

---

## Verify Installation

### Check Services

```bash
# Frontend
curl http://localhost:5173

# Backend health
curl http://localhost:5000/health

# Detailed health
curl http://localhost:5000/health/ready
```

### Expected Response

```json
{
  "status": "ready",
  "checks": {
    "mongodb": { "status": "healthy" },
    "redis": { "status": "healthy" },
    "memory": { "status": "healthy" }
  }
}
```

---

## Common Issues

### Port Already in Use

```bash
# Find process using port
# Windows
netstat -ano | findstr :5000

# Linux/Mac
lsof -i :5000

# Kill process
# Windows
taskkill /PID <pid> /F

# Linux/Mac
kill -9 <pid>
```

### MongoDB Connection Failed

```bash
# Start MongoDB via Docker
docker-compose up -d mongo

# Or check if MongoDB service is running
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

### Redis Connection Failed

```bash
# Start Redis via Docker
docker-compose up -d redis

# Or check if Redis service is running
# Windows
net start Redis

# Linux/Mac
sudo systemctl start redis
```

### Dependencies Not Installing

```bash
# Clear cache and reinstall
cd server
rm -rf node_modules package-lock.json
npm install

cd ../client
rm -rf node_modules package-lock.json
npm install
```

---

## Next Steps

1. **Explore the Dashboard**
   - Navigate to http://localhost:5173
   - Login with test credentials
   - View calendar, create bookings

2. **Test Real-Time Collaboration**
   - Open two browser windows
   - Login as different users
   - Edit same booking notes
   - Watch changes sync in real-time

3. **Test Stripe Billing**
   - Navigate to Billing page
   - Click "Upgrade Plan"
   - Use test card: 4242 4242 4242 4242

4. **Run Tests**
   ```bash
   # Backend
   cd server && npm test
   
   # Frontend
   cd client && npm test
   ```

5. **Read Documentation**
   - [README.md](./README.md) — Full documentation
   - [TESTING.md](./TESTING.md) — Testing guide
   - [DEPLOYMENT.md](./DEPLOYMENT.md) — Production deployment

---

## Helpful Commands

```bash
# Start all services (Docker)
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart single service
docker-compose restart backend

# Run migration
docker-compose exec backend npm run migrate:up

# Generate 100k test bookings
docker-compose exec backend npm run db:seed:large

# Access MongoDB shell
docker-compose exec mongo mongosh multitenant_saas

# Access Redis CLI
docker-compose exec redis redis-cli
```

---

## Getting Help

- **Documentation**: See [README.md](./README.md)
- **Issues**: Create GitHub issue
- **Testing**: See [TESTING.md](./TESTING.md)
- **Deployment**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**Ready to build something amazing? Let's go! 🚀**
