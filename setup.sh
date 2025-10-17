#!/bin/bash

# Tester Monitoring System Setup Script
# This script pre-downloads required Docker images and sets up the environment

echo "🚀 Setting up Tester Monitoring System..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "📦 Pre-downloading Docker images..."

# Pre-download Bun image
echo "  - Downloading Bun Alpine image..."
docker pull oven/bun:alpine

# Pre-download Nginx image
echo "  - Downloading Nginx Alpine image..."
docker pull nginx:alpine

echo "📁 Creating necessary directories..."

# Create data and logs directories
mkdir -p data logs nginx/ssl

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "   Please edit .env file with your configuration if needed"
fi

# Set proper permissions
echo "🔐 Setting permissions..."
chmod 755 data logs

echo "✅ Setup completed successfully!"
echo ""
echo "🎯 Next steps:"
echo "1. Edit .env file if needed (optional)"
echo "2. For development: docker-compose -f docker-compose.dev.yml up -d"
echo "3. For production: docker-compose --profile production up -d"
echo "4. Access the application at http://localhost:3000 (dev) or http://localhost (prod)"
echo ""
echo "📚 For more information, see README.md"