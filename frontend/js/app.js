// Main Application Module - Coordinates all components and handles application logic

// Import modules
import { api } from './api.js';
import { sseClient } from './sse.js';
import { configManager } from './config.js';
import { ui } from './ui.js';

class App {
  constructor() {
    this.isInitialized = false;
    this.currentEditingTester = null;
  }

  async initialize() {
    try {
      console.log('Initializing Tester Monitoring System...');
      
      // Show loading
      ui.showLoading();
      
      // Load configuration
      await configManager.loadConfig();
      
      // Setup UI event handlers
      this.setupUIEventHandlers();
      
      // Setup SSE event handlers
      this.setupSSEEventHandlers();
      
      // Initialize UI
      this.initializeUI();
      
      // Connect to SSE
      sseClient.connect();
      
      // Load initial data
      await this.loadInitialData();
      
      this.isInitialized = true;
      ui.hideLoading();
      
      console.log('Application initialized successfully');
      ui.showToast('Tester Monitoring System loaded successfully', 'success');
    } catch (error) {
      console.error('Failed to initialize application:', error);
      ui.hideLoading();
      ui.showToast('Failed to initialize application: ' + error.message, 'error');
    }
  }

  setupUIEventHandlers() {
    // Tester selection
    ui.on('ui:testerSelectionChanged', (data) => {
      if (data.selected) {
        configManager.selectTester(data.id);
      } else {
        configManager.deselectTester(data.id);
      }
      
      ui.updateTesterSelection(configManager.getSelectedTesters());
    });

    // Select/Deselect all
    ui.on('ui:selectAllTesters', () => {
      configManager.selectAllTesters();
      ui.updateTesterSelection(configManager.getSelectedTesters());
    });

    ui.on('ui:deselectAllTesters', () => {
      configManager.deselectAllTesters();
      ui.updateTesterSelection(configManager.getSelectedTesters());
    });

    // Toggle monitoring
    ui.on('ui:toggleMonitoring', async () => {
      if (configManager.isMonitoringActive()) {
        configManager.stopMonitoring();
        ui.updateMonitorButton(false);
        ui.showToast('Monitoring stopped', 'info');
      } else {
        const selectedTesters = configManager.getSelectedTesters();
        if (selectedTesters.length === 0) {
          ui.showToast('Please select at least one tester to monitor', 'warning');
          return;
        }
        
        configManager.startMonitoring();
        ui.updateMonitorButton(true);
        ui.showToast(`Monitoring ${selectedTesters.length} tester(s)`, 'success');
        
        // Refresh data for selected testers
        await this.refreshTestersData(selectedTesters);
      }
    });

    // Refresh all
    ui.on('ui:refresh', async () => {
      await this.refreshAllData();
    });

    // Display settings
    ui.on('ui:saveDisplaySettings', async (settings) => {
      try {
        const errors = configManager.validateDisplaySettings(settings);
        if (errors.length > 0) {
          ui.showToast('Invalid settings: ' + errors.join(', '), 'error');
          return;
        }

        await configManager.updateDisplaySettings(settings);
        ui.showToast('Display settings saved successfully', 'success');
        
        // Update UI
        this.updateTestersGrid();
      } catch (error) {
        ui.showToast('Failed to save display settings: ' + error.message, 'error');
      }
    });

    // Save configuration
    ui.on('ui:saveConfiguration', async () => {
      try {
        await configManager.saveConfig();
        ui.showToast('Configuration saved successfully', 'success');
      } catch (error) {
        ui.showToast('Failed to save configuration: ' + error.message, 'error');
      }
    });

    // Tester management
    ui.on('ui:editTester', (testerId) => {
      const tester = configManager.getTester(testerId);
      if (tester) {
        this.currentEditingTester = testerId;
        ui.showTesterModal(tester);
      }
    });

    ui.on('ui:deleteTester', async (testerId) => {
      const tester = configManager.getTester(testerId);
      if (!tester) return;

      if (confirm(`Are you sure you want to delete tester "${tester.display_name}"?`)) {
        try {
          await configManager.deleteTester(testerId);
          this.updateTestersList();
          this.updateTestersGrid();
          ui.showToast(`Tester "${tester.display_name}" deleted successfully`, 'success');
        } catch (error) {
          ui.showToast('Failed to delete tester: ' + error.message, 'error');
        }
      }
    });

    ui.on('ui:saveTester', async (testerData) => {
      try {
        const errors = configManager.validateTester(testerData);
        if (errors.length > 0) {
          ui.showToast('Invalid tester data: ' + errors.join(', '), 'error');
          return;
        }

        if (this.currentEditingTester) {
          // Update existing tester
          await configManager.updateTester(this.currentEditingTester, testerData);
          ui.showToast(`Tester "${testerData.display_name}" updated successfully`, 'success');
        } else {
          // Add new tester
          await configManager.addTester(testerData);
          ui.showToast(`Tester "${testerData.display_name}" added successfully`, 'success');
        }

        ui.hideModal();
        this.currentEditingTester = null;
        this.updateTestersList();
        this.updateTestersGrid();
      } catch (error) {
        ui.showToast('Failed to save tester: ' + error.message, 'error');
      }
    });
  }

  setupSSEEventHandlers() {
    // Connection events
    sseClient.on('connection:opened', () => {
      ui.updateSystemStatus('Connected', true);
    });

    sseClient.on('connection:closed', () => {
      ui.updateSystemStatus('Disconnected', false);
    });

    sseClient.on('connection:error', () => {
      ui.updateSystemStatus('Connection Error', false);
    });

    sseClient.on('connection:failed', () => {
      ui.updateSystemStatus('Connection Failed', false);
      ui.showToast('Failed to connect to server. Please refresh the page.', 'error');
    });

    // Data events
    sseClient.on('data:initial', (data) => {
      if (data.testers) {
        configManager.updateTestersData(data.testers);
        this.updateTestersGrid();
        ui.updateLastUpdate(new Date().toISOString());
      }
    });

    sseClient.on('data:update', (data) => {
      if (data.testers) {
        configManager.updateTestersData(data.testers);
        this.updateTestersGrid();
        ui.updateLastUpdate(new Date().toISOString());
      } else if (data.tester) {
        configManager.updateTestersData([data.tester]);
        this.updateSingleTesterCard(data.tester);
        ui.updateLastUpdate(new Date().toISOString());
      }
    });

    sseClient.on('data:error', (data) => {
      ui.showToast(`Error from tester ${data.testerId}: ${data.message}`, 'error');
    });

    // Configuration events
    sseClient.on('config:update', (config) => {
      configManager.config = config;
      this.updateTestersList();
      this.updateTestersGrid();
      ui.updateTesterSelection(configManager.getSelectedTesters());
      ui.showToast('Configuration updated from server', 'info');
    });
  }

  initializeUI() {
    // Update tester checkboxes
    const testers = configManager.getTesters();
    ui.renderTesterCheckboxes(testers);
    ui.updateTesterSelection(configManager.getSelectedTesters());

    // Update testers list
    this.updateTestersList();

    // Update display settings
    const settings = configManager.getDisplaySettings();
    ui.updateDisplaySettings(settings);

    // Update monitor button
    ui.updateMonitorButton(configManager.isMonitoringActive());

    // Show monitoring page by default
    ui.showPage('monitoring');
  }

  async loadInitialData() {
    try {
      const response = await api.getAllTestersData();
      if (response.success && response.data.testers) {
        configManager.updateTestersData(response.data.testers);
        this.updateTestersGrid();
        ui.updateLastUpdate(new Date().toISOString());
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      ui.showToast('Failed to load initial data: ' + error.message, 'error');
    }
  }

  async refreshAllData() {
    try {
      ui.showLoading();
      ui.showToast('Refreshing all testers...', 'info');

      const selectedTesters = configManager.getSelectedTesters();
      if (selectedTesters.length > 0) {
        await this.refreshTestersData(selectedTesters);
      } else {
        // Refresh all configured testers
        const testers = configManager.getTesters();
        const testerIds = testers.map(t => t.id);
        await this.refreshTestersData(testerIds);
      }

      ui.showToast('Data refreshed successfully', 'success');
    } catch (error) {
      ui.showToast('Failed to refresh data: ' + error.message, 'error');
    } finally {
      ui.hideLoading();
    }
  }

  async refreshTestersData(testerIds) {
    const promises = testerIds.map(async (testerId) => {
      try {
        await api.refreshTester(testerId);
      } catch (error) {
        console.error(`Failed to refresh tester ${testerId}:`, error);
        ui.showToast(`Failed to refresh tester ${testerId}: ${error.message}`, 'error');
      }
    });

    await Promise.all(promises);
  }

  updateTestersList() {
    const testers = configManager.getTesters();
    ui.renderTestersList(testers);
  }

  updateTestersGrid() {
    const selectedTesters = configManager.getSelectedTesters();
    const testersData = selectedTesters
      .map(id => configManager.getTesterData(id))
      .filter(data => data !== undefined);

    const settings = configManager.getDisplaySettings();
    ui.renderTestersGrid(testersData, settings);
  }

  updateSingleTesterCard(testerData) {
    const existingCard = document.querySelector(`[data-tester-id="${testerData.testerId}"]`);
    if (existingCard) {
      // Clear the existing card content before updating
      const cardContent = existingCard.querySelector('.tester-card-content');
      if (cardContent) {
        cardContent.innerHTML = '';
        // Add the new slot cards
        cardContent.innerHTML = testerData.slots.map(slot => ui.createSlotCard(slot)).join('');
      }
      
      // Update the status badges
      const statusContainer = existingCard.querySelector('.tester-card-status');
      if (statusContainer) {
        // Update the available badge if needed
        const existingAvailableBadge = statusContainer.querySelector('.status-badge.available');
        if (testerData.summary.available > 0 && !existingAvailableBadge) {
          // Add available badge if it doesn't exist
          const availableBadge = document.createElement('div');
          availableBadge.className = 'status-badge available';
          availableBadge.innerHTML = `
            <span class="status-badge-label">AVAILABLE</span>
            <span class="status-badge-value">${testerData.summary.available}</span>
          `;
          statusContainer.appendChild(availableBadge);
        } else if (testerData.summary.available === 0 && existingAvailableBadge) {
          // Remove available badge if count is 0
          existingAvailableBadge.remove();
        }
        
        // Update all badge values
        const badges = statusContainer.querySelectorAll('.status-badge');
        badges.forEach(badge => {
          const badgeClass = badge.className.split(' ').find(c => c !== 'status-badge');
          if (badgeClass && testerData.summary[badgeClass] !== undefined) {
            const valueElement = badge.querySelector('.status-badge-value');
            if (valueElement) {
              valueElement.textContent = testerData.summary[badgeClass];
            }
          }
        });
      }
    } else {
      // Card doesn't exist, update the entire grid
      this.updateTestersGrid();
    }
  }

  // Utility methods
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  getStatusColor(status) {
    const colors = {
      'TESTING': 'var(--status-testing)',
      'FAILING': 'var(--status-failing)',
      'PASSED': 'var(--status-passed)',
      'FAILED': 'var(--status-failed)',
      'ABORTED': 'var(--status-aborted)',
      'UNKNOWN': 'var(--status-unknown)'
    };
    return colors[status] || colors['UNKNOWN'];
  }

  // Handle window resize
  setupResizeHandler() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.updateTestersGrid();
      }, 250);
    });
  }

  // Handle page visibility change
  setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, reduce update frequency
        console.log('Page hidden, reducing update frequency');
      } else {
        // Page is visible, refresh data
        console.log('Page visible, refreshing data');
        if (configManager.isMonitoringActive()) {
          this.refreshAllData();
        }
      }
    });
  }

  // Cleanup
  cleanup() {
    sseClient.disconnect();
    console.log('Application cleanup completed');
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const app = new App();
  
  // Setup global handlers
  app.setupResizeHandler();
  app.setupVisibilityHandler();
  
  // Initialize application
  await app.initialize();
  
  // Make app available globally for debugging
  window.app = app;
  
  // Handle page unload
  window.addEventListener('beforeunload', () => {
    app.cleanup();
  });
});

// Export for module systems
export default App;