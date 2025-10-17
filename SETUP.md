# Setup Instructions

## Prerequisites
- Docker and Docker Compose installed
- Git (to clone the repository)

## Initial Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd TestProject
```

2. Copy the example environment file:
```bash
cp .env.example .env
```

3. Edit the `.env` file with your desired configuration:
```
NODE_ENV=production
PORT=3000
DATA_DIR=/app/data
CONFIG_FILE=/app/data/config.json
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log
MAX_CONCURRENT_REQUESTS=5
REQUEST_TIMEOUT=10000
```

## Running the Application

### Development Mode
```bash
docker-compose -f docker-compose.dev.yml up --build
```

### Production Mode
```bash
docker-compose up --build
```

## Troubleshooting

### Permission Issues with Config File
If you encounter permission errors when saving the configuration, it's likely due to Docker volume permissions. The application now uses named volumes to avoid these issues.

If you need to reset the data volume:
```bash
docker-compose down -v
docker-compose up --build
```

### Accessing the Application
- Frontend: http://localhost (production) or http://localhost:3000 (development)
- API: http://localhost:3000/api

### Configuration
The configuration file is automatically created on first run with default values. You can modify it through the web interface or by editing the file directly in the Docker volume.

To view the current configuration:
```bash
docker exec -it tester-monitoring-backend cat /app/data/config.json
```

To manually edit the configuration:
```bash
docker exec -it tester-monitoring-backend sh
vi /app/data/config.json
```

## File Structure
```
TestProject/
├── backend/
│   ├── src/
│   │   ├── config.ts      # Configuration management
│   │   ├── server.ts      # Express server
│   │   ├── scraper.ts     # Web scraping logic
│   │   ├── sse.ts         # Server-Sent Events
│   │   └── types.ts       # TypeScript type definitions
│   ├── scripts/
│   │   └── init-data.sh   # Data initialization script
│   └── Dockerfile
├── frontend/
│   ├── index.html
│   ├── css/
│   └── js/
├── data/
│   └── config.json        # Configuration file (auto-created)
├── docker-compose.yml     # Production Docker Compose
├── docker-compose.dev.yml # Development Docker Compose
└── .env.example           # Environment variables template