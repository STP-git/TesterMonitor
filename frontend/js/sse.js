// SSE Module - Handles Server-Sent Events for real-time updates

class SSEClient {
  constructor() {
    this.eventSource = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.eventHandlers = new Map();
  }

  connect() {
    if (this.eventSource) {
      this.disconnect();
    }

    try {
      this.eventSource = new EventSource('/api/events');
      this.setupEventListeners();
      console.log('SSE connection established');
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      this.handleReconnect();
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
      console.log('SSE connection closed');
    }
  }

  setupEventListeners() {
    if (!this.eventSource) return;

    this.eventSource.addEventListener('open', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('SSE connection opened');
      this.emit('connection:opened');
    });

    this.eventSource.addEventListener('error', (event) => {
      console.error('SSE error:', event);
      this.isConnected = false;
      this.emit('connection:error', event);
      
      // Attempt to reconnect
      this.handleReconnect();
    });

    this.eventSource.addEventListener('close', () => {
      this.isConnected = false;
      console.log('SSE connection closed');
      this.emit('connection:closed');
    });

    // Custom event types
    this.eventSource.addEventListener('initial', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE initial data received:', data);
        this.emit('data:initial', data);
      } catch (error) {
        console.error('Error parsing initial SSE data:', error);
      }
    });

    this.eventSource.addEventListener('update', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE update received:', data);
        this.emit('data:update', data);
      } catch (error) {
        console.error('Error parsing update SSE data:', error);
      }
    });

    this.eventSource.addEventListener('config', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE config update received:', data);
        this.emit('config:update', data);
      } catch (error) {
        console.error('Error parsing config SSE data:', error);
      }
    });

    this.eventSource.addEventListener('error', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE error received:', data);
        this.emit('data:error', data);
      } catch (parseError) {
        console.error('Error parsing error SSE data:', parseError);
        this.emit('data:error', { message: 'Unknown error' });
      }
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('connection:failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in SSE event handler for ${event}:`, error);
        }
      });
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

// Export singleton instance
export const sseClient = new SSEClient();