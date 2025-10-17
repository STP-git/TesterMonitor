import express from 'express';
import cors from 'cors';
import { configManager } from './config';
import { webScraper } from './scraper';
import { sseManager } from './sse';
import { Tester, TesterData, SystemStatus, ApiResponse } from './types';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Store latest data
let latestTestData: Map<string, TesterData> = new Map();
let refreshInterval: any = null;

// API Routes

// Get configuration
app.get('/api/config', async (req, res) => {
  try {
    const config = await configManager.loadConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_ERROR',
        message: 'Failed to load configuration',
        details: error
      }
    });
  }
});

// Update configuration
app.put('/api/config', async (req, res) => {
  try {
    const config = req.body;
    const success = await configManager.saveConfig(config);
    
    if (success) {
      // Broadcast configuration change
      sseManager.broadcastConfigChange(config);
      
      // Restart refresh interval with new settings
      restartRefreshInterval();
      
      res.json({
        success: true,
        message: 'Configuration updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'Failed to update configuration'
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_ERROR',
        message: 'Failed to update configuration',
        details: error
      }
    });
  }
});

// Add tester
app.post('/api/testers', async (req, res) => {
  try {
    const result = await configManager.addTester(req.body);
    
    if (result.success) {
      // Broadcast configuration change
      const config = await configManager.loadConfig();
      sseManager.broadcastConfigChange(config);
      
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_ERROR',
        message: 'Failed to add tester',
        details: error
      }
    });
  }
});

// Update tester
app.put('/api/testers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await configManager.updateTester(id, req.body);
    
    if (result.success) {
      // Broadcast configuration change
      const config = await configManager.loadConfig();
      sseManager.broadcastConfigChange(config);
      
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_ERROR',
        message: 'Failed to update tester',
        details: error
      }
    });
  }
});

// Delete tester
app.delete('/api/testers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await configManager.deleteTester(id);
    
    if (result.success) {
      // Remove from latest data
      latestTestData.delete(id);
      
      // Broadcast configuration change
      const config = await configManager.loadConfig();
      sseManager.broadcastConfigChange(config);
      
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_ERROR',
        message: 'Failed to delete tester',
        details: error
      }
    });
  }
});

// Get all tester data
app.get('/api/testers/data', async (req, res) => {
  try {
    const testers = await configManager.getTesters();
    const results: TesterData[] = [];
    
    for (const tester of testers) {
      const data = latestTestData.get(tester.id);
      if (data) {
        results.push(data);
      }
    }
    
    res.json({
      success: true,
      data: {
        testers: results
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DATA_ERROR',
        message: 'Failed to get tester data',
        details: error
      }
    });
  }
});

// Get specific tester data
app.get('/api/testers/:id/data', async (req, res) => {
  try {
    const { id } = req.params;
    const data = latestTestData.get(id);
    
    if (data) {
      res.json({
        success: true,
        data
      });
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `No data found for tester ${id}`
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DATA_ERROR',
        message: 'Failed to get tester data',
        details: error
      }
    });
  }
});

// Force refresh tester data
app.post('/api/testers/:id/refresh', async (req, res) => {
  try {
    const { id } = req.params;
    const testers = await configManager.getTesters();
    const tester = testers.find(t => t.id === id);
    
    if (!tester) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Tester ${id} not found`
        }
      });
    }
    
    // Scrape data for this specific tester
    try {
      const data = await webScraper.scrapeTesterData(tester);
      latestTestData.set(id, data);
      sseManager.broadcastTesterData(data);
      
      res.json({
        success: true,
        message: `Refresh initiated for tester ${id}`,
        data
      });
    } catch (error) {
      sseManager.broadcastError(id, `Failed to refresh: ${error}`);
      res.status(500).json({
        success: false,
        error: {
          code: 'SCRAPING_ERROR',
          message: `Failed to refresh tester ${id}`,
          details: error
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_ERROR',
        message: 'Failed to refresh tester',
        details: error
      }
    });
  }
});

// Get system status
app.get('/api/status', (req, res) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  const status: SystemStatus = {
    status: 'running',
    uptime: `${hours}h ${minutes}m ${seconds}s`,
    version: '1.0.0',
    activeConnections: sseManager.getConnectionCount(),
    lastUpdate: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: status
  });
});

// SSE endpoint
app.get('/api/events', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Add connection
  const connectionId = sseManager.addConnection(res);
  
  // Send initial data
  const initialData = Array.from(latestTestData.values());
  if (initialData.length > 0) {
    sseManager.sendEvent(connectionId, {
      event: 'initial',
      data: { testers: initialData },
      timestamp: new Date().toISOString()
    });
  }

  // Handle connection close
  req.on('close', () => {
    sseManager.removeConnection(connectionId);
  });

  req.on('aborted', () => {
    sseManager.removeConnection(connectionId);
  });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile('../frontend/index.html');
});

// Data fetching function
async function fetchAllTesterData(): Promise<void> {
  try {
    console.log('Fetching data for all testers...');
    const testers = await configManager.getTesters();
    
    if (testers.length === 0) {
      console.log('No testers configured');
      return;
    }
    
    const results = await webScraper.scrapeMultipleTesters(testers);
    
    // Update latest data
    results.forEach(data => {
      latestTestData.set(data.testerId, data);
    });
    
    // Broadcast updates
    if (results.length > 0) {
      sseManager.broadcastTestersData(results);
    }
    
    console.log(`Fetched data for ${results.length}/${testers.length} testers`);
  } catch (error) {
    console.error('Error fetching tester data:', error);
  }
}

// Start refresh interval
async function startRefreshInterval(): Promise<void> {
  try {
    const settings = await configManager.getDisplaySettings();
    const intervalMs = settings.refreshInterval * 1000;
    
    // Initial fetch
    await fetchAllTesterData();
    
    // Set up interval
    refreshInterval = setInterval(fetchAllTesterData, intervalMs);
    console.log(`Auto-refresh started with ${settings.refreshInterval}s interval`);
  } catch (error) {
    console.error('Error starting refresh interval:', error);
  }
}

// Restart refresh interval
async function restartRefreshInterval(): Promise<void> {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  
  await startRefreshInterval();
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  sseManager.shutdown();
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  sseManager.shutdown();
  
  process.exit(0);
});

// Start server
async function startServer(): Promise<void> {
  try {
    // Load configuration
    await configManager.loadConfig();
    
    // Start refresh interval
    await startRefreshInterval();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Tester Monitoring System running on port ${PORT}`);
      console.log(`Frontend available at http://localhost:${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();