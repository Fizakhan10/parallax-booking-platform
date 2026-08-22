#!/bin/bash

# TenantHub Setup Script
# Automates initial project setup

set -e

echo "🚀 TenantHub Setup Script"
echo "=========================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js ≥ 18"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. Install Docker to use containerized setup."
fi

if ! command -v docker-compose &> /dev/null; then
    echo "⚠️  Docker Compose is not installed."
fi

echo "✅ Node.js $(node --version) found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
echo ""

echo "Installing server dependencies..."
cd server && npm install
echo "✅ Server dependencies installed"
echo ""

echo "Installing client dependencies..."
cd ../client && npm install
echo "✅ Client dependencies installed"
echo ""

cd ..

# Create .env files if they don't exist
if [ ! -f "server/.env" ]; then
    echo "📝 Creating server/.env from example..."
    cp server/.env.example server/.env
    echo "⚠️  Please edit server/.env with your secrets!"
else
    echo "✅ server/.env already exists"
fi

if [ ! -f "client/.env" ]; then
    echo "📝 Creating client/.env..."
    cat > client/.env << 'EOF'
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
EOF
    echo "⚠️  Please edit client/.env with your Stripe publishable key!"
else
    echo "✅ client/.env already exists"
fi

if [ ! -f ".env" ]; then
    echo "📝 Creating root .env for Docker Compose..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your secrets for Docker deployment!"
else
    echo "✅ .env already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Next Steps:"
echo ""
echo "1. Update environment files with your secrets:"
echo "   - server/.env (JWT secrets, Stripe keys)"
echo "   - client/.env (Stripe publishable key)"
echo "   - .env (for Docker Compose)"
echo ""
echo "2. Choose your setup method:"
echo ""
echo "   Option A — Docker (Recommended):"
echo "   $ docker-compose up -d"
echo "   $ docker-compose exec backend npm run db:seed"
echo ""
echo "   Option B — Manual:"
echo "   Terminal 1: cd server && npm run dev"
echo "   Terminal 2: cd client && npm run dev"
echo ""
echo "3. Access the application:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:5000"
echo "   Health:   http://localhost:5000/health"
echo ""
echo "📖 For detailed instructions, see README.md"
echo ""
