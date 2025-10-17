# Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Tester Monitoring System using Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB of available RAM
- Network access to tester URLs

## Quick Start

1. Clone the repository
2. Configure environment variables
3. Start the services with Docker Compose
4. Access the application

```bash
git clone <repository-url>
cd tester-monitoring
cp .env.example .env
docker-compose up -d
```

## Environment Configuration

### Environment Variables (.env)

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Data Persistence
DATA_DIR=/app/data
CONFIG_FILE=/app/data/config.json

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log

# Performance
MAX_CONCURRENT_REQUESTS=5
REQUEST_TIMEOUT=10000

# Security
CORS_ORIGIN=*
API_RATE_LIMIT=60
```

## Docker Configuration

### Docker Compose (docker-compose.yml)

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: tester-monitoring-backend
    restart: unless-stopped
    ports:
      - "${PORT:-3000}:3000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=${PORT:-3000}
      - DATA_DIR=${DATA_DIR:-/app/data}
      - CONFIG_FILE=${CONFIG_FILE:-/app/data/config.json}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - LOG_FILE=${LOG_FILE:-/app/logs/app.log}
      - MAX_CONCURRENT_REQUESTS=${MAX_CONCURRENT_REQUESTS:-5}
      - REQUEST_TIMEOUT=${REQUEST_TIMEOUT:-10000}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/status"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - monitoring-network

  nginx:
    image: nginx:alpine
    container_name: tester-monitoring-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./frontend:/usr/share/nginx/html:ro
    depends_on:
      - backend
    networks:
      - monitoring-network
    profiles:
      - production

networks:
  monitoring-network:
    driver: bridge

volumes:
  data:
    driver: local
  logs:
    driver: local
```

### Backend Dockerfile (backend/Dockerfile)

```dockerfile
# Build stage
FROM oven/bun:alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Build TypeScript
RUN bun run build

# Production stage
FROM oven/bun:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bun -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=bun:nodejs /app/dist ./dist
COPY --from=builder --chown=bun:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=bun:nodejs /app/package.json ./package.json

# Create data directories
RUN mkdir -p /app/data /app/logs
RUN chown -R bun:nodejs /app/data /app/logs

# Switch to non-root user
USER bun

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/status || exit 1

# Start the application
CMD ["bun", "run", "dist/server.js"]
```

### Nginx Configuration (nginx/nginx.conf)

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=config:10m rate=1r/s;

    upstream backend {
        server backend:3000;
    }

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

        # Frontend routes
        location / {
            try_files $uri $uri/ /index.html;
        }

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Configuration API (stricter rate limit)
        location /api/config {
            limit_req zone=config burst=5 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # SSE endpoint
        location /api/events {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_buffering off;
        }

        # Static file caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## Initial Configuration

### Default Configuration File (data/config.json)

```json
{
  "testers": [
    {
      "id": "ist13",
      "display_name": "IST13",
      "url": "http://192.168.140.114:8080"
    }
  ],
  "displaySettings": {
    "testersPerRow": 3,
    "refreshInterval": 15
  }
}
```

## Deployment Steps

### 1. Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd tester-monitoring

# Create environment file
cp .env.example .env

# Start development services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f
```

### 2. Production Environment

```bash
# Clone the repository
git clone <repository-url>
cd tester-monitoring

# Create environment file
cp .env.example .env
# Edit .env with production values

# Create data directories
mkdir -p data logs

# Set appropriate permissions
chmod 755 data logs

# Start production services
docker-compose -f docker-compose.yml --profile production up -d

# Verify deployment
curl http://localhost/api/status
```

### 3. SSL Configuration (Optional)

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Generate self-signed certificate (for development)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/nginx.key \
  -out nginx/ssl/nginx.crt

# Or use Let's Encrypt for production
certbot certonly --webroot -w /var/www/html -d your-domain.com
```

## Monitoring and Maintenance

### Health Checks

```bash
# Check container status
docker-compose ps

# Check application health
curl http://localhost/api/status

# View logs
docker-compose logs -f backend
docker-compose logs -f nginx
```

### Backup and Restore

```bash
# Backup configuration
docker-compose exec backend cp /app/data/config.json /tmp/config-backup.json
docker cp $(docker-compose ps -q backend):/tmp/config-backup.json ./config-backup.json

# Restore configuration
docker cp ./config-backup.json $(docker-compose ps -q backend):/tmp/config-restore.json
docker-compose exec backend cp /tmp/config-restore.json /app/data/config.json
```

### Updates

```bash
# Pull latest changes
git pull

# Rebuild and restart services
docker-compose build --no-cache
docker-compose up -d

# Verify update
curl http://localhost/api/status
```

## Troubleshooting

### Common Issues

1. **Container won't start**
   - Check logs: `docker-compose logs`
   - Verify environment variables
   - Check port conflicts

2. **Can't access tester URLs**
   - Verify network connectivity
   - Check firewall settings
   - Test URL accessibility from container

3. **High memory usage**
   - Reduce concurrent requests
   - Increase refresh interval
   - Monitor with `docker stats`

4. **Data not persisting**
   - Check volume mounts
   - Verify directory permissions
   - Review container restart policy

### Performance Tuning

1. **Increase refresh interval** for large numbers of testers
2. **Limit concurrent requests** to prevent overwhelming target servers
3. **Enable nginx caching** for static assets
4. **Monitor resource usage** with Docker stats

## Security Considerations

1. **Network isolation**: Use Docker networks to isolate services
2. **Rate limiting**: Configure nginx rate limits for API endpoints
3. **SSL/TLS**: Use HTTPS in production environments
4. **Access control**: Consider adding authentication for production
5. **Regular updates**: Keep Docker images and dependencies updated

## Scaling

### Horizontal Scaling

For high-availability deployments:

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  backend:
    deploy:
      replicas: 3
    
  nginx:
    depends_on:
      - backend
```

### Load Balancing

Configure nginx to load balance across multiple backend instances:

```nginx
upstream backend {
    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}