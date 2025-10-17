// Configuration Module - Handles application configuration and state

// Import API module
import { api } from './api.js';

class ConfigManager {
  constructor() {
    this.config = {
      testers: [],
      displaySettings: {
        testersPerRow: 3,
        refreshInterval: 15
      }
    };
    this.selectedTesters = new Set();
    this.isMonitoring = false;
    this.testersData = new Map();
  }

  async loadConfig() {
    try {
      const response = await api.getConfig();
      if (response.success) {
        this.config = response.data;
        console.log('Configuration loaded:', this.config);
        return this.config;
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw error;
    }
  }

  async saveConfig() {
    try {
      // We need to send the entire config to the backend
      // The backend has a PUT /api/config endpoint that accepts the full config
      const response = await api.updateConfig(this.config);
      if (response.success) {
        console.log('Configuration saved:', this.config);
        return true;
      } else {
        throw new Error(response.error?.message || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw error;
    }
  }

  getTesters() {
    return this.config.testers || [];
  }

  getTester(id) {
    return this.config.testers.find(tester => tester.id === id);
  }

  async addTester(tester) {
    try {
      // Just add the tester to local config without calling the API
      // The save will be done when the user clicks the Save Configuration button
      this.config.testers.push(tester);
      return tester;
    } catch (error) {
      console.error('Failed to add tester:', error);
      throw error;
    }
  }

  async updateTester(id, updates) {
    try {
      // Just update the tester in local config without calling the API
      // The save will be done when the user clicks the Save Configuration button
      const testerIndex = this.config.testers.findIndex(t => t.id === id);
      if (testerIndex !== -1) {
        this.config.testers[testerIndex] = { ...this.config.testers[testerIndex], ...updates };
        return this.config.testers[testerIndex];
      }
      throw new Error(`Tester with ID '${id}' not found`);
    } catch (error) {
      console.error('Failed to update tester:', error);
      throw error;
    }
  }

  async deleteTester(id) {
    try {
      // Just remove the tester from local config without calling the API
      // The save will be done when the user clicks the Save Configuration button
      const testerIndex = this.config.testers.findIndex(t => t.id === id);
      if (testerIndex !== -1) {
        this.config.testers.splice(testerIndex, 1);
        // Remove from selected testers if present
        this.selectedTesters.delete(id);
        // Remove from cached data
        this.testersData.delete(id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete tester:', error);
      throw error;
    }
  }

  getDisplaySettings() {
    return this.config.displaySettings || {
      testersPerRow: 3,
      refreshInterval: 15
    };
  }

  async updateDisplaySettings(settings) {
    try {
      this.config.displaySettings = { ...this.config.displaySettings, ...settings };
      const response = await api.updateConfig(this.config);
      if (response.success) {
        return this.config.displaySettings;
      } else {
        throw new Error(response.error?.message || 'Failed to update display settings');
      }
    } catch (error) {
      console.error('Failed to update display settings:', error);
      throw error;
    }
  }

  // Tester selection management
  selectTester(id) {
    this.selectedTesters.add(id);
  }

  deselectTester(id) {
    this.selectedTesters.delete(id);
  }

  toggleTesterSelection(id) {
    if (this.selectedTesters.has(id)) {
      this.selectedTesters.delete(id);
    } else {
      this.selectedTesters.add(id);
    }
  }

  selectAllTesters() {
    this.config.testers.forEach(tester => {
      this.selectedTesters.add(tester.id);
    });
  }

  deselectAllTesters() {
    this.selectedTesters.clear();
  }

  getSelectedTesters() {
    return Array.from(this.selectedTesters);
  }

  isTesterSelected(id) {
    return this.selectedTesters.has(id);
  }

  getSelectedTestersCount() {
    return this.selectedTesters.size;
  }

  // Monitoring state management
  startMonitoring() {
    this.isMonitoring = true;
  }

  stopMonitoring() {
    this.isMonitoring = false;
  }

  isMonitoringActive() {
    return this.isMonitoring;
  }

  // Testers data management
  setTesterData(id, data) {
    this.testersData.set(id, data);
  }

  getTesterData(id) {
    return this.testersData.get(id);
  }

  getAllTestersData() {
    return Array.from(this.testersData.values());
  }

  updateTestersData(testersData) {
    if (Array.isArray(testersData)) {
      testersData.forEach(data => {
        this.testersData.set(data.testerId, data);
      });
    } else if (testersData.tester) {
      // Single tester update
      this.testersData.set(testersData.tester.testerId, testersData.tester);
    }
  }

  clearTestersData() {
    this.testersData.clear();
  }

  // Utility methods
  validateTester(tester) {
    const errors = [];
    
    if (!tester.id || tester.id.trim() === '') {
      errors.push('ID is required');
    }
    
    if (!tester.display_name || tester.display_name.trim() === '') {
      errors.push('Display name is required');
    }
    
    if (!tester.url || tester.url.trim() === '') {
      errors.push('URL is required');
    } else {
      try {
        new URL(tester.url);
      } catch {
        errors.push('Invalid URL format');
      }
    }
    
    return errors;
  }

  validateDisplaySettings(settings) {
    const errors = [];
    
    if (settings.testersPerRow !== undefined) {
      if (settings.testersPerRow < 1 || settings.testersPerRow > 5) {
        errors.push('Testers per row must be between 1 and 5');
      }
    }
    
    if (settings.refreshInterval !== undefined) {
      if (settings.refreshInterval < 15) {
        errors.push('Refresh interval must be at least 15 seconds');
      }
    }
    
    return errors;
  }

  // Export/Import configuration
  exportConfig() {
    const dataStr = JSON.stringify(this.config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tester-monitoring-config.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async importConfig(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const config = JSON.parse(event.target.result);
          
          // Validate configuration
          if (!config.testers || !Array.isArray(config.testers)) {
            throw new Error('Invalid configuration: testers must be an array');
          }
          
          if (!config.displaySettings) {
            throw new Error('Invalid configuration: displaySettings is required');
          }
          
          // Save to server
          this.config = config;
          await this.saveConfig();
          
          // Clear local state
          this.selectedTesters.clear();
          this.testersData.clear();
          
          resolve(config);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }
}

// Export singleton instance
const configManager = new ConfigManager();

// Make it globally available for other modules
window.configManager = configManager;

// Export for module systems
export { configManager };