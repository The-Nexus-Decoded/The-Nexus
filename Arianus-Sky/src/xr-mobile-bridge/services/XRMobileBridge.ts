import {
  ConnectionState,
  GesturePayload,
  RenderPayload,
  GestureData,
  ThermalData,
  ProximityData,
} from '../types';

export interface XRMobileBridgeConfig {
  host: string;
  port?: number;
  useSsl?: boolean;
  token?: string;
  reconnect?: boolean;
  maxReconnectDelay?: number;
  onStateChange?: (state: ConnectionState) => void;
  onMessage?: (payload: RenderPayload) => void;
  onError?: (error: Error) => void;
}

const DEFAULT_CONFIG = {
  port: 8080,
  useSsl: false,
  reconnect: true,
  maxReconnectDelay: 30000,
};

export class XRMobileBridge {
  private ws: WebSocket | null = null;
  private config: XRMobileBridgeConfig & typeof DEFAULT_CONFIG;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private messageCache: Map<string, { data: RenderPayload; timestamp: number }> = new Map();
  private cacheTTL = 5000; // 5 seconds

  constructor(config: XRMobileBridgeConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getState(): ConnectionState {
    return this.state;
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.config.onStateChange?.(newState);
    }
  }

  private getUrl(): string {
    const { host, port, useSsl } = this.config;
    const protocol = useSsl ? 'wss' : 'ws';
    return `${protocol}://${host}:${port}/spatial`;
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setState('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.getUrl());

        this.ws.onopen = () => {
          this.setState('connecting');
          this.reconnectAttempts = 0;
          
          // Authenticate if token provided
          if (this.config.token) {
            this.send({
              type: 'auth',
              timestamp: Date.now(),
              data: { token: this.config.token },
            });
          }
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as RenderPayload;
            this.handleMessage(payload);
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        };

        this.ws.onerror = (event) => {
          const error = new Error('WebSocket error');
          this.config.onError?.(error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.setState('disconnected');
          this.handleDisconnect();
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  private handleMessage(payload: RenderPayload): void {
    // Cache response by type
    this.messageCache.set(payload.type, {
      data: payload,
      timestamp: Date.now(),
    });

    // Throttle cache cleanup
    if (this.messageCache.size > 10) {
      this.cleanupCache();
    }

    // Handle auth response
    if (payload.type === 'state' && this.state === 'connecting') {
      this.setState('authenticated');
      // Wait for first proximity/thermal to go operational
      return;
    }

    // Go operational after first proximity or thermal
    if ((payload.type === 'proximity' || payload.type === 'thermal') && 
        this.state === 'authenticated') {
      this.setState('operational');
    }

    this.config.onMessage?.(payload);
  }

  private handleDisconnect(): void {
    if (!this.config.reconnect) {
      return;
    }

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.config.maxReconnectDelay
    );

    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.messageCache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.messageCache.delete(key);
      }
    }
  }

  getCachedMessage(type: string): RenderPayload | null {
    const cached = this.messageCache.get(type);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  send(payload: GesturePayload | { type: string; timestamp: number; data: unknown }): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }

    this.ws.send(JSON.stringify(payload));
  }

  sendGesture(gesture: GestureData): void {
    this.send({
      type: 'gesture',
      timestamp: Date.now(),
      data: gesture,
    });
  }

  sendThermal(chipTemp: number): void {
    this.send({
      type: 'thermal',
      timestamp: Date.now(),
      data: {
        chipTemp,
        timestamp: Date.now(),
      } as ThermalData,
    });
  }

  sendProximity(distance: number): void {
    this.send({
      type: 'proximity',
      timestamp: Date.now(),
      data: {
        distance,
        timestamp: Date.now(),
      } as ProximityData,
    });
  }

  disconnect(): void {
    this.config.reconnect = false;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setState('disconnected');
  }
}
