/**
 * Spatial API Client
 * Mobile-side consumption of Haplo's spatial/anchor, haptic, and event APIs
 * Connects to: GET/POST /spatial/anchor, POST /haptic/trigger, WS /events
 */

import { SpatialIntent } from './gesture-capture';
import { config } from './config';

export interface AnchorState {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  timestamp: number;
}

export interface HapticPayload {
  intent: 'medium' | 'high' | 'error';
  pattern: number[]; // ms durations
  intensity: number; // 0-1
}

export interface GestureEvent {
  gesture: 'double_tap' | 'long_press' | 'rotate' | 'tap' | 'hold' | 'swipe';
  position: { x: number; y: number; z: number };
  target: string;
  timestamp: number;
  duration?: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

type AnchorCallback = (state: AnchorState) => void;
type GestureCallback = (event: GestureEvent) => void;
type ConnectionCallback = (state: ConnectionState) => void;

const DEFAULT_CONFIG = {
  wsUrl: config.eventsEndpoint,
  httpBase: config.httpBase,
  reconnectDelay: 3000,
  maxReconnectAttempts: 5,
};

export class SpatialAPIClient {
  private ws: WebSocket | null = null;
  private config: typeof DEFAULT_CONFIG;
  private anchorCallbacks: Set<AnchorCallback> = new Set();
  private gestureCallbacks: Set<GestureCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private reconnectAttempts = 0;
  private connectionState: ConnectionState = 'disconnected';

  constructor(config: Partial<typeof DEFAULT_CONFIG> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============ WebSocket Connection ============

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.setConnectionState('connecting');

    try {
      this.ws = new WebSocket(this.config.wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setConnectionState('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.warn('Failed to parse WS message:', e);
        }
      };

      this.ws.onclose = () => {
        this.setConnectionState('disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = () => {
        this.setConnectionState('error');
      };
    } catch (e) {
      this.setConnectionState('error');
      this.attemptReconnect();
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setConnectionState('disconnected');
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.warn('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => this.connect(), this.config.reconnectDelay);
  }

  private handleMessage(data: any): void {
    // Gesture events from XR side
    if (data.gesture) {
      const event: GestureEvent = {
        gesture: data.gesture,
        position: data.position || { x: 0, y: 0, z: 0 },
        target: data.target || 'unknown',
        timestamp: data.timestamp || Date.now(),
        duration: data.duration,
      };
      this.gestureCallbacks.forEach(cb => cb(event));
    }

    // Anchor updates
    if (data.type === 'anchor_update' && data.anchor) {
      const state: AnchorState = data.anchor;
      this.anchorCallbacks.forEach(cb => cb(state));
    }
  }

  // ============ HTTP Endpoints ============

  /**
   * GET /spatial/anchor - Fetch current world anchor state
   */
  async getAnchorState(): Promise<AnchorState | null> {
    try {
      const response = await fetch(`${this.config.httpBase}/spatial/anchor`);
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      console.warn('Failed to fetch anchor state:', e);
      return null;
    }
  }

  /**
   * POST /spatial/anchor - Initialize session anchor
   */
  async initAnchor(sessionId: string): Promise<AnchorState | null> {
    try {
      const response = await fetch(`${this.config.httpBase}/spatial/anchor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      console.warn('Failed to init anchor:', e);
      return null;
    }
  }

  /**
   * POST /haptic/trigger - Trigger haptics on device
   */
  async triggerHaptic(payload: HapticPayload): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.httpBase}/haptic/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.ok;
    } catch (e) {
      console.warn('Failed to trigger haptic:', e);
      return false;
    }
  }

  // Convenience: standard haptic patterns
  async hapticIntent(): Promise<boolean> {
    return this.triggerHaptic({ intent: 'medium', pattern: [35], intensity: 0.8 });
  }

  async hapticConfirmed(): Promise<boolean> {
    return this.triggerHaptic({ intent: 'high', pattern: [50, 50], intensity: 1.0 });
  }

  async hapticError(): Promise<boolean> {
    return this.triggerHaptic({ intent: 'error', pattern: [40, 40, 40], intensity: 1.0 });
  }

  // ============ Callbacks ============

  onAnchor(callback: AnchorCallback): void {
    this.anchorCallbacks.add(callback);
  }

  offAnchor(callback: AnchorCallback): void {
    this.anchorCallbacks.delete(callback);
  }

  onGesture(callback: GestureCallback): void {
    this.gestureCallbacks.add(callback);
  }

  offGesture(callback: GestureCallback): void {
    this.gestureCallbacks.delete(callback);
  }

  onConnectionChange(callback: ConnectionCallback): void {
    this.connectionCallbacks.add(callback);
  }

  offConnectionChange(callback: ConnectionCallback): void {
    this.connectionCallbacks.delete(callback);
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.connectionCallbacks.forEach(cb => cb(state));
  }
}

export default SpatialAPIClient;
