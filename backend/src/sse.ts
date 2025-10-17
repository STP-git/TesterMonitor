import { SSEConnection, SSEEvent, TesterData } from "./types";

export class SSEManager {
  private connections: Map<string, SSEConnection> = new Map();
  private pingInterval: any = null;
  private connectionIdCounter = 0;

  constructor() {
    this.startPingInterval();
  }

  addConnection(response: any): string {
    const connectionId = `conn_${++this.connectionIdCounter}`;
    const connection: SSEConnection = {
      id: connectionId,
      response,
      lastPing: Date.now()
    };

    this.connections.set(connectionId, connection);
    console.log(`SSE connection added: ${connectionId}. Total connections: ${this.connections.size}`);

    // Send initial connection event
    this.sendEvent(connectionId, {
      event: 'initial',
      data: { message: 'Connected to Tester Monitoring System' },
      timestamp: new Date().toISOString()
    });

    return connectionId;
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        connection.response.end();
      } catch (error) {
        console.error(`Error ending connection ${connectionId}:`, error);
      }
      
      this.connections.delete(connectionId);
      console.log(`SSE connection removed: ${connectionId}. Total connections: ${this.connections.size}`);
    }
  }

  broadcastTestersData(testersData: TesterData[]): void {
    const event: SSEEvent = {
      event: 'update',
      data: { testers: testersData },
      timestamp: new Date().toISOString()
    };

    this.broadcast(event);
  }

  broadcastTesterData(testerData: TesterData): void {
    const event: SSEEvent = {
      event: 'update',
      data: { tester: testerData },
      timestamp: new Date().toISOString()
    };

    this.broadcast(event);
  }

  broadcastConfigChange(config: any): void {
    const event: SSEEvent = {
      event: 'config',
      data: config,
      timestamp: new Date().toISOString()
    };

    this.broadcast(event);
  }

  broadcastError(testerId: string, error: string): void {
    const event: SSEEvent = {
      event: 'error',
      data: {
        message: error,
        testerId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.broadcast(event);
  }

  private broadcast(event: SSEEvent): void {
    const deadConnections: string[] = [];

    this.connections.forEach((connection, connectionId) => {
      try {
        this.sendEvent(connectionId, event);
      } catch (error) {
        console.error(`Error sending event to connection ${connectionId}:`, error);
        deadConnections.push(connectionId);
      }
    });

    // Clean up dead connections
    deadConnections.forEach(connectionId => {
      this.removeConnection(connectionId);
    });
  }

  public sendEvent(connectionId: string, event: SSEEvent): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const { event: eventType, data, timestamp } = event;
    
    // Format SSE message
    let message = '';
    if (eventType) {
      message += `event: ${eventType}\n`;
    }
    message += `data: ${JSON.stringify(data)}\n`;
    if (timestamp) {
      message += `id: ${timestamp}\n`;
    }
    message += '\n';

    connection.response.write(message);
    connection.lastPing = Date.now();
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const deadConnections: string[] = [];

      this.connections.forEach((connection, connectionId) => {
        // Check if connection is stale (no activity for 30 seconds)
        if (now - connection.lastPing > 30000) {
          deadConnections.push(connectionId);
        } else {
          // Send ping
          try {
            connection.response.write(': ping\n\n');
          } catch (error) {
            console.error(`Error pinging connection ${connectionId}:`, error);
            deadConnections.push(connectionId);
          }
        }
      });

      // Clean up dead connections
      deadConnections.forEach(connectionId => {
        this.removeConnection(connectionId);
      });

      if (deadConnections.length > 0) {
        console.log(`Cleaned up ${deadConnections.length} stale SSE connections`);
      }
    }, 15000); // Ping every 15 seconds
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getActiveConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Close all connections
    this.connections.forEach((connection, connectionId) => {
      try {
        connection.response.end();
      } catch (error) {
        console.error(`Error closing connection ${connectionId}:`, error);
      }
    });

    this.connections.clear();
    console.log('SSE Manager shutdown complete');
  }
}

// Export singleton instance
export const sseManager = new SSEManager();