# API Specification

## Overview

This document defines the REST API endpoints and Server-Sent Events (SSE) for communication between the frontend and backend of the Tester Monitoring System.

## Base URL

```
http://localhost:3000/api
```

## REST API Endpoints

### Configuration Management

#### Get Configuration
```http
GET /api/config
```

**Response:**
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

#### Update Configuration
```http
PUT /api/config
Content-Type: application/json
```

**Request Body:**
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

**Response:**
```json
{
  "success": true,
  "message": "Configuration updated successfully"
}
```

#### Add Tester
```http
POST /api/testers
Content-Type: application/json
```

**Request Body:**
```json
{
  "id": "ist14",
  "display_name": "IST14",
  "url": "http://192.168.140.115:8080"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tester added successfully",
  "tester": {
    "id": "ist14",
    "display_name": "IST14",
    "url": "http://192.168.140.115:8080"
  }
}
```

#### Update Tester
```http
PUT /api/testers/:id
Content-Type: application/json
```

**Request Body:**
```json
{
  "display_name": "IST14 Updated",
  "url": "http://192.168.140.115:8080"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tester updated successfully",
  "tester": {
    "id": "ist14",
    "display_name": "IST14 Updated",
    "url": "http://192.168.140.115:8080"
  }
}
```

#### Delete Tester
```http
DELETE /api/testers/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Tester deleted successfully"
}
```

### Data Management

#### Get All Tester Data
```http
GET /api/testers/data
```

**Response:**
```json
{
  "testers": [
    {
      "testerId": "ist13",
      "status": "PASSED",
      "timestamp": "2025-10-17T10:42:00Z",
      "slots": [
        {
          "slotId": "SLOT01",
          "status": "passed",
          "sn": "SFT",
          "testTime": "1:19:45",
          "serialNumber": "332404254207449",
          "production": "Production",
          "project": "AZ3324_2025.10.08-01"
        }
      ],
      "summary": {
        "testing": 12,
        "failing": 0,
        "passed": 3,
        "failed": 1,
        "aborted": 0
      }
    }
  ]
}
```

#### Get Specific Tester Data
```http
GET /api/testers/:id/data
```

**Response:**
```json
{
  "testerId": "ist13",
  "status": "PASSED",
  "timestamp": "2025-10-17T10:42:00Z",
  "slots": [
    {
      "slotId": "SLOT01",
      "status": "passed",
      "sn": "SFT",
      "testTime": "1:19:45",
      "serialNumber": "332404254207449",
      "production": "Production",
      "project": "AZ3324_2025.10.08-01"
    }
  ],
  "summary": {
    "testing": 12,
    "failing": 0,
    "passed": 3,
    "failed": 1,
    "aborted": 0
  }
}
```

#### Force Refresh Tester Data
```http
POST /api/testers/:id/refresh
```

**Response:**
```json
{
  "success": true,
  "message": "Refresh initiated for tester ist13"
}
```

### System Information

#### Get System Status
```http
GET /api/status
```

**Response:**
```json
{
  "status": "running",
  "uptime": "2h 34m 12s",
  "version": "1.0.0",
  "activeConnections": 3,
  "lastUpdate": "2025-10-17T10:42:00Z"
}
```

## Server-Sent Events (SSE)

### Connect to Real-time Updates
```http
GET /api/events
Accept: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

#### Event Format

**Initial Data Event:**
```
event: initial
data: {
  "testers": [
    {
      "testerId": "ist13",
      "status": "PASSED",
      "timestamp": "2025-10-17T10:42:00Z",
      "slots": [...],
      "summary": {...}
    }
  ]
}
```

**Update Event:**
```
event: update
data: {
  "testerId": "ist13",
  "status": "PASSED",
  "timestamp": "2025-10-17T10:42:00Z",
  "slots": [...],
  "summary": {...}
}
```

**Configuration Change Event:**
```
event: config
data: {
  "testers": [...],
  "displaySettings": {
    "testersPerRow": 3,
    "refreshInterval": 15
  }
}
```

**Error Event:**
```
event: error
data: {
  "message": "Failed to fetch data from tester ist13",
  "testerId": "ist13",
  "timestamp": "2025-10-17T10:42:00Z"
}
```

## Error Handling

### HTTP Status Codes

- **200 OK**: Successful request
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid URL format",
    "details": {
      "field": "url",
      "value": "invalid-url"
    }
  }
}
```

### Common Error Codes

- **VALIDATION_ERROR**: Invalid input data
- **NOT_FOUND**: Resource not found
- **DUPLICATE_ID**: Tester ID already exists
- **NETWORK_ERROR**: Failed to fetch tester data
- **PARSE_ERROR**: Failed to parse HTML response
- **CONFIG_ERROR**: Configuration file error

## Data Models

### Tester
```typescript
interface Tester {
  id: string;
  display_name: string;
  url: string;
}
```

### SlotData
```typescript
interface SlotData {
  slotId: string;
  status: string;
  sn: string;
  testTime: string;
  serialNumber: string;
  production: string;
  project: string;
}
```

### TesterData
```typescript
interface TesterData {
  testerId: string;
  status: string;
  timestamp: string;
  slots: SlotData[];
  summary: {
    testing: number;
    failing: number;
    passed: number;
    failed: number;
    aborted: number;
  };
}
```

### Config
```typescript
interface Config {
  testers: Tester[];
  displaySettings: {
    testersPerRow: number;
    refreshInterval: number;
  };
}
```

## Request/Response Examples

### Adding a New Tester (cURL)
```bash
curl -X POST http://localhost:3000/api/testers \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ist15",
    "display_name": "IST15",
    "url": "http://192.168.140.116:8080"
  }'
```

### Getting Configuration (JavaScript)
```javascript
const response = await fetch('/api/config');
const config = await response.json();
console.log(config.testers);
```

### Connecting to SSE (JavaScript)
```javascript
const eventSource = new EventSource('/api/events');

eventSource.addEventListener('update', (event) => {
  const data = JSON.parse(event.data);
  updateTesterCard(data);
});

eventSource.addEventListener('error', (event) => {
  console.error('SSE error:', event);
});
```

## Rate Limiting

- **Configuration Endpoints**: 10 requests per minute
- **Data Endpoints**: 60 requests per minute
- **SSE Connections**: 5 concurrent connections per IP

## Authentication

Currently no authentication is required as this is an internal monitoring system. Authentication can be added in future versions if needed.

## CORS

The API will be configured to allow requests from the same origin. For development, CORS will be enabled for all origins.

## Versioning

The API is currently at version 1.0.0. Future versions will maintain backward compatibility where possible.