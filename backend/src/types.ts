export interface Tester {
  id: string;
  display_name: string;
  url: string;
}

export interface SlotData {
  slotId: string;
  status: string;
  sn: string;
  testTime: string;
  serialNumber: string;
  production: string;
  project: string;
}

export interface TesterData {
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
    available?: number;
  };
}

export interface Config {
  testers: Tester[];
  displaySettings: {
    testersPerRow: number;
    refreshInterval: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface SSEEvent {
  event: 'initial' | 'update' | 'config' | 'error';
  data: any;
  timestamp: string;
}

export interface SystemStatus {
  status: 'running' | 'stopped' | 'error';
  uptime: string;
  version: string;
  activeConnections: number;
  lastUpdate: string;
}

export interface ScrapingOptions {
  timeout: number;
  retries: number;
  retryDelay: number;
}

export interface SSEConnection {
  id: string;
  response: any;
  lastPing: number;
}