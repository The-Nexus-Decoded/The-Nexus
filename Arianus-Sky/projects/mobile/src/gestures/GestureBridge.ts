// GestureBridge - Mobile → WebSocket → VR Intent Bus
// Translates touch/hand-tracking gestures to JSON intents for VR consumption

export type GestureType = 
  // Touch gestures
  | 'tap' | 'hold' | 'swipe' | 'pinch' | 'rotate'
  // XR Hand-tracking gestures (v1.0 spec)
  | 'grab' | 'point' | 'palm_push' | 'two_hand_pinch' | 'snap_turn' | 'air_tap';

export interface Vector2 {
  x: number;
  y: number;
}

export interface GestureIntent {
  type: GestureType;
  position: Vector2;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface SwipeMetadata {
  direction: 'left' | 'right' | 'up' | 'down';
  deltaX: number;
  deltaY: number;
}

export interface HoldMetadata {
  duration: number;
}

export interface PinchMetadata {
  scale: number;
  center: Vector2;
  deltaDistance: number;
}

export interface RotateMetadata {
  angle: number;
  center: Vector2;
  deltaAngle: number;
}

// XR Hand-tracking gesture metadata (v1.0 spec)
export interface GrabMetadata {
  hand: 'left' | 'right' | 'both';
  grabStrength: number; // 0-1
}

export interface PointMetadata {
  hand: 'left' | 'right';
  cursorPosition: Vector2; // 3D world position
}

export interface PalmPushMetadata {
  hand: 'left' | 'right';
  pushDirection: Vector2; // 3D direction
  pushDistance: number;
}

export interface TwoHandPinchMetadata {
  leftPinch: boolean;
  rightPinch: boolean;
  scale: number;
  center: Vector2;
}

export interface SnapTurnMetadata {
  hand: 'left' | 'right';
  rotationAngle: number; // degrees
  direction: 'left' | 'right';
}

export interface AirTapMetadata {
  hand: 'left' | 'right';
  tapPosition: Vector2; // 3D position in world space
}

// VR→Mobile: Incoming gesture from VR device (Meta Quest, etc.)
export interface VRGestureEvent {
  type: 'gesture';
  gesture: GestureType;
  hand: 'left' | 'right';
  confidence: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  timestamp: number;
  source: string; // e.g. "meta-quest-hand-tracking"
}

export interface IGestureBridge {
  connect(wsUrl: string): Promise<void>;
  disconnect(): void;
  sendIntent(intent: GestureIntent): void;
  onIntentReceived(callback: (intent: GestureIntent) => void): void;
  readonly isConnected: boolean;
}

export class GestureBridge implements IGestureBridge {
  private ws: WebSocket | null = null;
  private intentCallbacks: ((intent: GestureIntent) => void)[] = [];
  private vrGestureCallbacks: ((event: VRGestureEvent) => void)[] = [];
  private _isConnected = false;

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this._isConnected = true;
          console.log('[GestureBridge] Connected to', wsUrl);
          resolve();
        };

        this.ws.onclose = () => {
          this._isConnected = false;
          console.log('[GestureBridge] Disconnected');
        };

        this.ws.onerror = (error) => {
          console.error('[GestureBridge] WebSocket error:', error);
          reject(error);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle VR→Mobile gesture events (Meta Quest format)
            if (data.type === 'gesture' && data.gesture) {
              const vrEvent = data as VRGestureEvent;
              this.vrGestureCallbacks.forEach(cb => cb(vrEvent));
              return;
            }
            
            // Handle Mobile→VR intent responses
            const intent = data as GestureIntent;
            this.intentCallbacks.forEach(cb => cb(intent));
          } catch (e) {
            console.error('[GestureBridge] Failed to parse message:', e);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this._isConnected = false;
    }
  }

  sendIntent(intent: GestureIntent): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[GestureBridge] Not connected, intent dropped');
      return;
    }

    const payload = JSON.stringify({
      type: intent.type,
      position: intent.position,
      timestamp: intent.timestamp,
      metadata: intent.metadata
    });

    this.ws.send(payload);
  }

  onIntentReceived(callback: (intent: GestureIntent) => void): void {
    this.intentCallbacks.push(callback);
  }

  // Register callback for VR→Mobile gesture events
  onVRGesture(callback: (event: VRGestureEvent) => void): void {
    this.vrGestureCallbacks.push(callback);
  }
}

// Singleton instance for app-wide use
export const gestureBridge = new GestureBridge();
