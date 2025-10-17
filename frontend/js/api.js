// API Module - Handles all HTTP requests to the backend

class ApiClient {
  constructor() {
    this.baseUrl = '/api';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Configuration endpoints
  async getConfig() {
    return this.request('/config');
  }

  async updateConfig(config) {
    return this.request('/config', {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  }

  // Tester endpoints
  async addTester(tester) {
    return this.request('/testers', {
      method: 'POST',
      body: JSON.stringify(tester)
    });
  }

  async updateTester(id, updates) {
    return this.request(`/testers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteTester(id) {
    return this.request(`/testers/${id}`, {
      method: 'DELETE'
    });
  }

  // Data endpoints
  async getAllTestersData() {
    return this.request('/testers/data');
  }

  async getTesterData(id) {
    return this.request(`/testers/${id}/data`);
  }

  async refreshTester(id) {
    return this.request(`/testers/${id}/refresh`, {
      method: 'POST'
    });
  }

  // System endpoints
  async getSystemStatus() {
    return this.request('/status');
  }
}

// Export singleton instance
export const api = new ApiClient();