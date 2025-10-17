@echo off
REM Tester Monitoring System Setup Script for Windows
REM This script pre-downloads required Docker images and sets up the environment

echo 🚀 Setting up Tester Monitoring System...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

echo 📦 Pre-downloading Docker images...

REM Pre-download Bun image
echo   - Downloading Bun Alpine image...
docker pull oven/bun:alpine

REM Pre-download Nginx image
echo   - Downloading Nginx Alpine image...
docker pull nginx:alpine

echo 📁 Creating necessary directories...

REM Create data and logs directories
if not exist "data" mkdir data
if not exist "logs" mkdir logs
if not exist "nginx\ssl" mkdir nginx\ssl

REM Copy environment file if it doesn't exist
if not exist ".env" (
    echo 📝 Creating environment file...
    copy .env.example .env >nul
    echo    Please edit .env file with your configuration if needed
)

echo ✅ Setup completed successfully!
echo.
echo 🎯 Next steps:
echo 1. Edit .env file if needed ^(optional^)
echo 2. For development: docker-compose -f docker-compose.dev.yml up -d
echo 3. For production: docker-compose --profile production up -d
echo 4. Access the application at http://localhost:3000 ^(dev^) or http://localhost ^(prod^)
echo.
echo 📚 For more information, see README.md
pause