# Implementation Plan

## Project Structure
```
tester-monitoring/
├── backend/
│   ├── src/
│   │   ├── server.ts          # Main Bun server
│   │   ├── scraper.ts         # Web scraping logic
│   │   ├── config.ts          # Configuration management
│   │   ├── sse.ts             # Server-Sent Events
│   │   └── types.ts           # TypeScript type definitions
│   ├── package.json           # Dependencies
│   ├── tsconfig.json          # TypeScript configuration
│   └── Dockerfile             # Backend Docker configuration
├── frontend/
│   ├── index.html             # Main HTML page
│   ├── css/
│   │   ├── style.css          # Main stylesheet
│   │   └── components.css     # Component-specific styles
│   ├── js/
│   │   ├── app.js             # Main application logic
│   │   ├── api.js             # API communication
│   │   ├── sse.js             # SSE client
│   │   ├── ui.js              # UI components and interactions
│   │   └── config.js          # Configuration management
│   └── assets/                # Images, icons, etc.
├── docker-compose.yml         # Docker Compose configuration
├── nginx.conf                 # Nginx configuration (optional)
└── README.md                  # Project documentation
```

## Backend Implementation Details

### 1. Main Server (server.ts)
- Initialize Bun HTTP server
- Set up API routes for configuration management
- Serve static frontend files
- Initialize SSE endpoint
- Start periodic data fetching

### 2. Web Scraping (scraper.ts)
- Fetch HTML from tester URLs using Axios
- Parse HTML with Cheerio to extract slot data
- Transform data into standardized format
- Handle errors and retries
- Calculate summary statistics

### 3. Configuration Management (config.ts)
- Read/write configuration from JSON file
- Validate input data
- Provide CRUD operations for testers
- Manage display settings

### 4. Server-Sent Events (sse.ts)
- Maintain active SSE connections
- Broadcast updates to all connected clients
- Handle client disconnections
- Format data for frontend consumption

### 5. Type Definitions (types.ts)
```typescript
interface Tester {
  id: string;
  display_name: string;
  url: string;
}

interface SlotData {
  slotId: string;
  status: string;
  sn: string;
  testTime: string;
  serialNumber: string;
  production: string;
  project: string;
}

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

interface Config {
  testers: Tester[];
  displaySettings: {
    testersPerRow: number;
    refreshInterval: number;
  };
}
```

## Frontend Implementation Details

### 1. HTML Structure (index.html)
- Semantic HTML5 structure
- Left sidebar for navigation and configuration
- Main content area for tester cards
- Configuration modal overlay
- Responsive meta tags

### 2. CSS Styling (style.css, components.css)
- CSS Grid for main layout
- Flexbox for component layouts
- CSS custom properties for theming
- Responsive design with media queries
- Smooth transitions and animations
- Status-based color coding

### 3. JavaScript Components

#### app.js
- Application initialization
- Global state management
- Event delegation setup
- Error handling

#### api.js
- HTTP client for backend communication
- Configuration CRUD operations
- Error handling and retry logic

#### sse.js
- SSE client implementation
- Connection management
- Data processing and UI updates
- Reconnection logic

#### ui.js
- DOM manipulation helpers
- Component rendering functions
- Event handlers for user interactions
- Modal management

#### config.js
- Configuration form handling
- Input validation
- Settings persistence

## Key Features Implementation

### 1. Tester Card Component
```javascript
function createTesterCard(testerData) {
  // Create card element with header, status, and slot container
  // Add click handler to navigate to tester URL
  // Make slot container scrollable
  // Apply status-based styling
}
```

### 2. Slot Card Component
```javascript
function createSlotCard(slotData) {
  // Create sub-card with header, body, and footer
  // Format data according to requirements
  // Apply status-based styling
}
```

### 3. Configuration Modal
```javascript
function showConfigModal() {
  // Display modal with tester list
  // Allow add/edit/delete operations
  // Configure display settings
  // Save changes to backend
}
```

### 4. Real-time Updates
```javascript
function handleSSEUpdate(data) {
  // Process incoming data
  // Update relevant tester cards
  // Animate changes if needed
  // Update summary statistics
}
```

## Docker Configuration

### 1. Backend Dockerfile
```dockerfile
FROM oven/bun:alpine
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY . .
EXPOSE 3000
CMD ["bun", "run", "src/server.ts"]
```

### 2. Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
```

## Development Workflow

1. Set up project structure
2. Implement backend with basic scraping
3. Create frontend with static layout
4. Add real-time updates with SSE
5. Implement configuration management
6. Add responsive design
7. Create Docker configuration
8. Test and optimize

## Testing Strategy

1. Unit tests for scraping logic
2. Integration tests for API endpoints
3. End-to-end tests for user workflows
4. Performance tests for concurrent connections
5. Error handling tests for network failures