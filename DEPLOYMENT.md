# Deployment Guide

Production deployment guide for TenantHub SaaS Platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment Options](#cloud-deployment-options)
- [Database Setup](#database-setup)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring Setup](#monitoring-setup)
- [Backup Strategy](#backup-strategy)

---

## Prerequisites

### Required Services

- **Compute**: VM or container orchestration (AWS EC2, DigitalOcean, Kubernetes)
- **Database**: MongoDB Atlas, AWS DocumentDB, or self-hosted MongoDB
- **Cache**: Redis Cloud, AWS ElastiCache, or self-hosted Redis
- **Domain**: Registered domain with DNS management
- **SSL**: Let's Encrypt or managed SSL certificates
- **Payments**: Stripe account (production mode)

### Required Tools

```bash
# Server
- Docker Engine 20.10+
- Docker Compose 2.0+
- Git

# Local (for deployment)
- SSH client
- Docker CLI
- kubectl (for Kubernetes)
```

---

## Environment Configuration

### Production Environment Variables

Create `.env` file on production server:

```env
# Application
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/multitenant_saas?retryWrites=true&w=majority
REDIS_URL=redis://redis-hostname:6379

# JWT Secrets (generate new for production!)
JWT_SECRET=<strong-random-64-char-string>
JWT_REFRESH_SECRET=<strong-random-64-char-string>
COOKIE_SECRET=<strong-random-64-char-string>

# Stripe Production Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (production products)
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Frontend URL
CLIENT_URL=https://yourdomain.com

# Optional: Monitoring
SENTRY_DSN=https://...
NEW_RELIC_LICENSE_KEY=...
```

### Generate Strong Secrets

```bash
# JWT secrets
openssl rand -base64 64

# Cookie secret
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

---

## Docker Deployment

### Option 1: Docker Compose (Single Server)

Suitable for: Small to medium deployments, up to 10k users

```bash
# 1. Clone repository on server
git clone https://github.com/yourusername/tenanthub.git
cd tenanthub

# 2. Create production .env
nano .env
# (paste production environment variables)

# 3. Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Check service health
docker-compose ps

# 5. Run database migration
docker-compose exec backend npm run migrate:up

# 6. Seed initial data (optional)
docker-compose exec backend npm run db:seed

# 7. View logs
docker-compose logs -f
```

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.9'

services:
  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    restart: always
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
    env_file:
      - .env
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile
      args:
        VITE_API_URL: https://api.yourdomain.com
        VITE_WS_URL: wss://api.yourdomain.com
        VITE_STRIPE_PUBLISHABLE_KEY: ${STRIPE_PUBLISHABLE_KEY}
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:80/"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

# Note: Use managed MongoDB and Redis in production
# Remove mongo and redis services from docker-compose.yml
```

---

## Cloud Deployment Options

### AWS Deployment

#### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Route 53 (DNS)                      │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│              CloudFront (CDN) + WAF                     │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│         Application Load Balancer (ALB)                 │
└─────┬────────────────────────────┬──────────────────────┘
      │                            │
┌─────▼─────┐              ┌──────▼────────┐
│  ECS/EKS  │              │  ECS/EKS      │
│  (Backend)│              │  (Frontend)   │
│  Fargate  │              │  Fargate      │
└─────┬─────┘              └───────────────┘
      │
      ├──────────────┬─────────────────┬────────────────┐
      │              │                 │                │
┌─────▼─────┐  ┌────▼─────┐    ┌──────▼────┐  ┌───────▼───────┐
│DocumentDB │  │ElastiCache│    │   S3      │  │  CloudWatch   │
│ (MongoDB) │  │  (Redis)  │    │ (Assets)  │  │  (Logs)       │
└───────────┘  └───────────┘    └───────────┘  └───────────────┘
```

#### Setup Steps

```bash
# 1. Create ECR repositories
aws ecr create-repository --repository-name tenanthub-backend
aws ecr create-repository --repository-name tenanthub-frontend

# 2. Build and push images
docker build -t tenanthub-backend ./server
docker tag tenanthub-backend:latest <aws-account>.dkr.ecr.<region>.amazonaws.com/tenanthub-backend:latest
docker push <aws-account>.dkr.ecr.<region>.amazonaws.com/tenanthub-backend:latest

# 3. Create ECS cluster
aws ecs create-cluster --cluster-name tenanthub-prod

# 4. Create task definitions (see ecs-task-definition.json)
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

# 5. Create ECS services
aws ecs create-service \
  --cluster tenanthub-prod \
  --service-name backend \
  --task-definition tenanthub-backend \
  --desired-count 2 \
  --launch-type FARGATE

# 6. Set up ALB and target groups
# (Use AWS Console or CloudFormation)

# 7. Configure Route 53
# Point domain to ALB DNS name
```

### DigitalOcean App Platform

```bash
# 1. Create App via doctl or Console
doctl apps create --spec app.yaml

# app.yaml
---
name: tenanthub
services:
  - name: backend
    github:
      repo: yourusername/tenanthub
      branch: main
      deploy_on_push: true
    dockerfile_path: server/Dockerfile
    http_port: 5000
    instance_count: 2
    instance_size_slug: professional-xs
    envs:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        value: ${db.CONNECTION_STRING}
    health_check:
      http_path: /health

  - name: frontend
    github:
      repo: yourusername/tenanthub
      branch: main
    dockerfile_path: client/Dockerfile
    http_port: 80
    instance_count: 1
    instance_size_slug: basic-xxs

databases:
  - name: db
    engine: MONGODB
    version: "6"
    size: db-s-1vcpu-1gb
```

### Kubernetes Deployment

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: your-registry/backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: production
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: mongodb-uri
        livenessProbe:
          httpGet:
            path: /health/live
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 5000
  type: LoadBalancer
```

Deploy:

```bash
# Create secrets
kubectl create secret generic app-secrets \
  --from-literal=mongodb-uri='mongodb+srv://...' \
  --from-literal=jwt-secret='...' \
  --from-literal=stripe-key='...'

# Apply manifests
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml

# Check deployment
kubectl get pods
kubectl get services
kubectl logs -f deployment/backend
```

---

## Database Setup

### MongoDB Atlas (Recommended)

```bash
# 1. Create cluster at cloud.mongodb.com
# 2. Choose region close to your app servers
# 3. Select M10+ for production (auto-scaling, backups)
# 4. Configure network access (whitelist app server IPs)
# 5. Create database user with strong password
# 6. Get connection string:
#    mongodb+srv://username:password@cluster.mongodb.net/multitenant_saas

# 7. Run migration
MONGODB_URI='your-connection-string' npm run migrate:up

# 8. Enable point-in-time recovery
# (Atlas Console → Backup → Configure)
```

### AWS DocumentDB

```bash
# 1. Create cluster
aws docdb create-db-cluster \
  --db-cluster-identifier tenanthub-cluster \
  --engine docdb \
  --master-username admin \
  --master-user-password <strong-password>

# 2. Create instance
aws docdb create-db-instance \
  --db-instance-identifier tenanthub-instance \
  --db-instance-class db.r5.large \
  --engine docdb \
  --db-cluster-identifier tenanthub-cluster

# 3. Get endpoint
aws docdb describe-db-clusters \
  --db-cluster-identifier tenanthub-cluster \
  --query 'DBClusters[0].Endpoint'

# 4. Download CA certificate
wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# 5. Connection string
mongodb://admin:password@cluster-endpoint:27017/multitenant_saas?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

### Redis Cloud

```bash
# 1. Create database at redis.com/cloud
# 2. Select region
# 3. Choose plan (30MB free, 250MB-10GB paid)
# 4. Get connection details:
#    redis://default:password@endpoint:port

# 5. Update .env
REDIS_URL=redis://default:password@endpoint:port
```

---

## SSL/TLS Configuration

### Let's Encrypt with Certbot

```bash
# 1. Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# 2. Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 3. Auto-renewal (crontab)
sudo crontab -e
# Add: 0 3 * * * certbot renew --quiet

# 4. Update nginx config
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket for collaboration
    location /collaboration {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Monitoring Setup

### Health Check Monitoring

```bash
# UptimeRobot
curl -X POST https://api.uptimerobot.com/v2/newMonitor \
  -d "api_key=YOUR_API_KEY" \
  -d "friendly_name=TenantHub API" \
  -d "url=https://api.yourdomain.com/health/ready" \
  -d "type=1" \
  -d "interval=300"
```

### Application Monitoring (Sentry)

```javascript
// server/src/app.js
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Error handler
app.use(Sentry.Handlers.errorHandler());
```

### Log Aggregation

```yaml
# docker-compose.prod.yml
services:
  backend:
    logging:
      driver: "fluentd"
      options:
        fluentd-address: localhost:24224
        tag: backend
```

---

## Backup Strategy

### Database Backups

```bash
# MongoDB Atlas: Automatic continuous backups (M10+)
# Retention: 7-day point-in-time recovery

# Manual backup
mongodump --uri="mongodb+srv://..." --out=/backups/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb+srv://..." /backups/20260822
```

### Application Backups

```bash
# Backup script (backup.sh)
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR=/backups/$DATE

# Backup environment files
mkdir -p $BACKUP_DIR
cp .env $BACKUP_DIR/
cp docker-compose.prod.yml $BACKUP_DIR/

# Backup database
mongodump --uri="$MONGODB_URI" --out=$BACKUP_DIR/db

# Upload to S3
aws s3 sync $BACKUP_DIR s3://tenanthub-backups/$DATE/

# Keep last 30 days
find /backups -type d -mtime +30 -exec rm -rf {} \;
```

---

## Post-Deployment Checklist

- [ ] All services healthy (docker-compose ps)
- [ ] Database migration applied (migrate:up)
- [ ] SSL certificate valid and auto-renewing
- [ ] Health endpoints returning 200
- [ ] Stripe webhook endpoint configured
- [ ] DNS records pointing to correct IPs
- [ ] Monitoring and alerts configured
- [ ] Backup strategy implemented
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Team trained on deployment process

---

For support, consult README.md or open a GitHub issue.
