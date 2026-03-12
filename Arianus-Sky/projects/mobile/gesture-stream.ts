// Gesture Stream WebSocket Client
// Connects to XR gesture endpoint via config (default: ws://localhost:7890/xrpc)

import { GestureEvent, ACTION_EFFECT_MAP, XRThermal } from './gesture-types';
import { config } from './config';

export type GestureEventHandler = (event: GestureEvent) => void;
export type ThermalEventHandler = (thermal: XRThermal) => void;
export type ConnectionStateHandler = (state: ConnectionState) => void;

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR',
}

interface GestureStreamConfig {
  autoReconnect?: boolean;
  reconnectMinDelay?: number;
  reconnectMaxDelay?: number;
  reconnectMultiplier?: number;
}

const DEFAULT_CONFIG: Required<GestureStreamConfig> = {
  autoReconnect: true,
  reconnectMinDelay: 1000,
  reconnectMaxDelay: 8000,
  reconnectMultiplier: 2,
};

export class GestureStream {
  private ws: WebSocket | null = null;
  private config: Required<GestureStreamConfig>;
  private handlers: {
    gesture: GestureEventHandler[];
    thermal: ThermalEventHandler[];
    connection: ConnectionStateHandler[];
  } = {
    gesture: [],
    thermal: [],
    connection: [],
  };
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempt = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: GestureStreamConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // === Connection Management ===

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setState(ConnectionState.CONNECTING);

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(config.wsEndpoint);

        this.ws.onopen = () => {
          this.reconnectAttempt = 0;
          this.setState(ConnectionState.CONNECTED);
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          this.setState(ConnectionState.DISCONNECTED);
          if (this.config.autoReconnect && !event.wasClean) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.setState(ConnectionState.ERROR);
          reject(error);
        };
      } catch (error) {
        this.setState(ConnectionState.ERROR);
        reject(error);
      }

  disconnect(): }
    });
  void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setState(ConnectionState.DISCONNECTED);
  }

  // === Message Handling ===

  private handleMessage(data: string): void {
    try {
      const event = JSON.parse(data) as GestureEvent;

      // Validate gesture event structure
      if (!event.gesture_id || !event.intent) {
        console.warn('[GestureStream] Invalid event structure:', event);
        return;
      }

      // Emit thermal updates
      if (event.thermal) {
        this.handlers.thermal.forEach(h => h(event.thermal));
      }

      // Emit gesture events
      this.handlers.gesture.forEach(h => h(event));

    } catch (error) {
      console.error('[GestureStream] Failed to parse message:', error);
    }
  }

  // === Reconnection Logic ===

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return;
    }

    this.setState(ConnectionState.RECONNECTING);

    const delay = Math.min(
      this.config.reconnectMinDelay * Math.pow(this.config.reconnectMultiplier, this.reconnectAttempt),
      this.config.reconnectMaxDelay
    );

    this.reconnectAttempt++;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect().catch(() => {
        // connect() will trigger scheduleReconnect again via onclose
      });
    }, delay);
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.handlers.connection.forEach(h => h(state));
  }

  // === Event Subscriptions ===

  onGesture(handler: GestureEventHandler): () => void {
    this.handlers.gesture.push(handler);
    return () => {
      this.handlers.gesture = this.handlers.gesture.filter(h => h !== handler);
    };
  }

  onThermal(handler: ThermalEventHandler): () => void {
    this.handlers.thermal.push(handler);
    return () => {
      this.handlers.thermal = this.handlers.thermal.filter(h => h !== handler);
    };
  }

  onConnectionChange(handler: ConnectionStateHandler): () => void {
    this.handlers.connection.push(handler);
    return () => {
      this.handlers.connection = this.handlers.connection.filter(h => h !== handler);
    };
  }

  // === Utility ===

  getState(): ConnectionState {
    return this.state;
  }

  getEffectForAction(action: GestureEvent['intent']['action']): string {
    return ACTION_EFFECT_MAP[action] ?? 'none';
  }
}

// === Singleton Instance ===

let streamInstance: GestureStream | null = null;

export function getGestureStream(config?: GestureStreamConfig): GestureStream {
  if (!streamInstance) {
    streamInstance = new GestureStream(config);
  }
  return streamInstance;
}
