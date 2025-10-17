// Configuration Module - Handles application configuration and state

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
      const response = await api.updateConfig(this.config);
      if (response.success) {
        console.log('Configuration saved:', this.config);
        return true;
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw error;
    }
    return false;
  }

  getTesters() {
    return this.config.testers || [];
  }

  getTester(id) {
    return this.config.testers.find(tester => tester.id === id);
  }

  async addTester(tester) {
    try {
      const response = await api.addTester(tester);
      if (response.success) {
        await this.loadConfig(); // Reload config from server
        return response.data;
      }
    } catch (error) {
      console.error('Failed to add tester:', error);
      throw error;
    }
  }

  async updateTester(id, updates) {
    try {
      const response = await api.updateTester(id, updates);
      if (response.success) {
        await this.loadConfig(); // Reload config from server
        return response.data;
      }
    } catch (error) {
      console.error('Failed to update tester:', error);
      throw error;
    }
  }

  async deleteTester(id) {
    try {
      const response = await api.deleteTester(id);
      if (response.success) {
        await this.loadConfig(); // Reload config from server
        // Remove from selected testers if present
        this.selectedTesters.delete(id);
        // Remove from cached data
        this.testersData.delete(id);
        return true;
      }
    } catch (error) {
      console.error('Failed to delete tester:', error);
      throw error;
    }
    return false;
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
      const success = await this.saveConfig();
      if (success) {
        return this.config.displaySettings;
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
export const configManager = new ConfigManager();