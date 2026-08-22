@echo off
REM TenantHub Setup Script for Windows
REM Automates initial project setup

echo.
echo 🚀 TenantHub Setup Script
echo ==========================
echo.

REM Check Node.js
echo 📋 Checking prerequisites...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js >= 18
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% found
echo.

REM Check Docker
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Docker is not installed. Install Docker to use containerized setup.
)

REM Install dependencies
echo 📦 Installing dependencies...
echo.

echo Installing server dependencies...
cd server
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install server dependencies
    exit /b 1
)
echo ✅ Server dependencies installed
echo.

echo Installing client dependencies...
cd ..\client
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install client dependencies
    exit /b 1
)
echo ✅ Client dependencies installed
echo.

cd ..

REM Create .env files if they don't exist
if not exist "server\.env" (
    echo 📝 Creating server\.env from example...
    copy server\.env.example server\.env >nul
    echo ⚠️  Please edit server\.env with your secrets!
) else (
    echo ✅ server\.env already exists
)

if not exist "client\.env" (
    echo 📝 Creating client\.env...
    (
        echo VITE_API_URL=http://localhost:5000
        echo VITE_WS_URL=ws://localhost:5000
        echo VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
    ) > client\.env
    echo ⚠️  Please edit client\.env with your Stripe publishable key!
) else (
    echo ✅ client\.env already exists
)

if not exist ".env" (
    echo 📝 Creating root .env for Docker Compose...
    copy .env.example .env >nul
    echo ⚠️  Please edit .env with your secrets for Docker deployment!
) else (
    echo ✅ .env already exists
)

echo.
echo ✅ Setup complete!
echo.
echo 📚 Next Steps:
echo.
echo 1. Update environment files with your secrets:
echo    - server\.env (JWT secrets, Stripe keys^)
echo    - client\.env (Stripe publishable key^)
echo    - .env (for Docker Compose^)
echo.
echo 2. Choose your setup method:
echo.
echo    Option A — Docker (Recommended^):
echo    docker-compose up -d
echo    docker-compose exec backend npm run db:seed
echo.
echo    Option B — Manual:
echo    Terminal 1: cd server ^&^& npm run dev
echo    Terminal 2: cd client ^&^& npm run dev
echo.
echo 3. Access the application:
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:5000
echo    Health:   http://localhost:5000/health
echo.
echo 📖 For detailed instructions, see README.md
echo.

pause
