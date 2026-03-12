/**
 * GestureBridge - Receives SpatialIntent from mobile via postMessage
 * Implements Gesture Resolver Contract V1
 */

import { 
  SpatialIntent, 
  GestureEvent, 
  GestureType, 
  GestureConfig, 
  DEFAULT_CONFIG,
  GestureState,
  AmbientMode 
} from './types';

type GestureCallback = (event: GestureEvent) => void;

export class GestureBridge {
  private config: GestureConfig;
  private lastGestureTime: number = 0;
  private lastPosition: { x: number; y: number; z: number } | null = null;
  private tapTimestamps: number[] = [];
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private state: GestureState = 'idle';
  private ambientMode: AmbientMode = 'full';
  private callbacks: Set<GestureCallback> = new Set();
  private targetElement: any = null;

  constructor(config: Partial<GestureConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the bridge - sets up postMessage listener
   */
  initialize(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleMessage.bind(this));
    }
  }

  /**
   * Cleanup listener
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this.handleMessage.bind(this));
    }
    this.clearHoldTimer();
    this.callbacks.clear();
  }

  /**
   * Register gesture callback
   */
  onGesture(callback: GestureCallback): void {
    this.callbacks.add(callback);
  }

  /**
   * Remove gesture callback
   */
  offGesture(callback: GestureCallback): void {
    this.callbacks.delete(callback);
  }

  /**
   * Set ambient mode
   */
  setAmbientMode(mode: AmbientMode): void {
    this.ambientMode = mode;
    if (mode === 'silent') {
      this.state = 'disabled';
    } else if (this.state === 'disabled') {
      this.state = 'idle';
    }
  }

  /**
   * Get current state
   */
  getState(): GestureState {
    return this.state;
  }

  /**
   * Handle incoming postMessage from mobile
   */
  private handleMessage(event: MessageEvent): void {
    if (this.ambientMode === 'silent') return;

    // Rate limiting - last_writer_wins, 2s cap
    const now = Date.now();
    if (now - this.lastGestureTime < this.config.rateLimitMs) {
      return;
    }
    this.lastGestureTime = now;

    const data = event.data;
    if (!this.isValidSpatialIntent(data)) return;

    this.processIntent(data);
  }

  /**
   * Validate incoming payload
   */
  private isValidSpatialIntent(data: any): data is SpatialIntent {
    return (
      data &&
      typeof data.action === 'string' &&
      ['tap', 'hold', 'swipe'].includes(data.action) &&
      data.position &&
      typeof data.position.x === 'number' &&
      typeof data.position.y === 'number' &&
      typeof data.position.z === 'number' &&
      typeof data.target === 'string' &&
      typeof data.timestamp === 'number'
    );
  }

  /**
   * Process SpatialIntent and emit VR gesture
   */
  private processIntent(intent: SpatialIntent): void {
    const now = Date.now();
    const gesture = this.mapToGesture(intent, now);
    
    const event: GestureEvent = {
      gesture,
      position: {
        x: intent.position.x,
        y: intent.position.y,
        z: intent.position.z,
      },
      target: intent.target,
      timestamp: intent.timestamp,
      duration: intent.action === 'hold' ? now - intent.timestamp : undefined,
    };

    // Emit to all callbacks
    this.callbacks.forEach(cb => cb(event));
  }

  /**
   * Map SpatialIntent action to VR gesture type
   */
  private mapToGesture(intent: SpatialIntent, now: number): GestureType {
    switch (intent.action) {
      case 'tap':
        return this.detectDoubleTap(now) ? 'double_tap' : 'tap';
      
      case 'hold':
        return 'long_press';
      
      case 'swipe':
        return 'tap'; // Swipe maps to tap in V1
      
      default:
        return 'tap';
    }
  }

  /**
   * Detect double tap (300ms threshold)
   */
  private detectDoubleTap(now: number): boolean {
    // Filter out taps older than threshold
    this.tapTimestamps = this.tapTimestamps.filter(
      t => now - t < this.config.doubleTapThreshold
    );
    
    this.tapTimestamps.push(now);
    
    // If we have 2 taps within threshold, it's a double tap
    return this.tapTimestamps.length >= 2;
  }

  /**
   * Start hold detection
   */
  startHoldDetection(intent: SpatialIntent): void {
    if (this.ambientMode === 'silent') return;
    
    this.state = 'active';
    
    this.clearHoldTimer();
    this.holdTimer = setTimeout(() => {
      this.emitHold(intent);
    }, this.config.longPressThreshold);
  }

  /**
   * Cancel hold detection
   */
  cancelHoldDetection(): void {
    this.clearHoldTimer();
    if (this.state === 'active') {
      this.state = 'idle';
    }
  }

  private emitHold(intent: SpatialIntent): void {
    const event: GestureEvent = {
      gesture: 'long_press',
      position: intent.position,
      target: intent.target,
      timestamp: Date.now(),
      duration: this.config.longPressThreshold,
    };
    
    this.callbacks.forEach(cb => cb(event));
    this.state = 'idle';
  }

  private clearHoldTimer(): void {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  /**
   * Set target VR element for visual feedback
   */
  setTarget(element: any): void {
    this.targetElement = element;
  }
}

export default GestureBridge;
