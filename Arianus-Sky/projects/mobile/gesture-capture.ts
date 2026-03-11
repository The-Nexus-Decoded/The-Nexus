/**
 * Mobile Gesture Capture
 * Captures touch gestures and emits SpatialIntent payloads
 * Implements Gesture Resolver Contract V1
 */

import { toWorldSpace, SpatialBounds, DEFAULT_BOUNDS } from '../../SpatialProjector';

export interface SpatialIntent {
  action: 'tap' | 'hold' | 'swipe';
  position: { x: number; y: number; z: number };
  target: string;
  timestamp: number;
}

export type GestureAction = 'tap' | 'hold' | 'swipe';

export interface GestureConfig {
  tapThresholdMs: number;      // Max ms for tap detection (200)
  holdThresholdMs: number;      // Min ms for hold detection (500)
  swipeThresholdPx: number;     // Min px for swipe detection (50)
  targetUrl: string;           // VR app URL for postMessage
  coordinateSystem: 'world' | 'normalized';
  bounds: SpatialBounds;      // Play space dimensions for world projection
}

const DEFAULT_CONFIG: GestureConfig = {
  tapThresholdMs: 200,
  holdThresholdMs: 500,
  swipeThresholdPx: 50,
  targetUrl: '*', // Wildcard for VR preview
  coordinateSystem: 'normalized', // XR expects 0-1 normalized coords
  bounds: DEFAULT_BOUNDS,
};

type IntentCallback = (intent: SpatialIntent) => void;

export class GestureCapture {
  private config: GestureConfig;
  private element: HTMLElement | null = null;
  private startTime: number = 0;
  private startPosition: { x: number; y: number } = { x: 0, y: 0 };
  private currentPosition: { x: number; y: number } = { x: 0, y: 0 };
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private isTracking: boolean = false;
  private callbacks: Set<IntentCallback> = new Set();
  private currentTarget: string = 'unknown';

  constructor(config: Partial<GestureConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Attach gesture capture to an element
   */
  attach(element: HTMLElement): void {
    this.element = element;
    this.setupListeners();
  }

  /**
   * Detach and cleanup
   */
  detach(): void {
    if (this.element) {
      this.element.removeEventListener('touchstart', this.handleTouchStart);
      this.element.removeEventListener('touchmove', this.handleTouchMove);
      this.element.removeEventListener('touchend', this.handleTouchEnd);
      this.element.removeEventListener('touchcancel', this.handleTouchEnd);
      
      // Mouse fallbacks for testing
      this.element.removeEventListener('mousedown', this.handleMouseDown);
      this.element.removeEventListener('mousemove', this.handleMouseMove);
      this.element.removeEventListener('mouseup', this.handleMouseUp);
    }
    this.clearHoldTimer();
    this.element = null;
  }

  /**
   * Register intent callback
   */
  onIntent(callback: IntentCallback): void {
    this.callbacks.add(callback);
  }

  /**
   * Remove callback
   */
  offIntent(callback: IntentCallback): void {
    this.callbacks.delete(callback);
  }

  /**
   * Set the target (for multi-element UIs)
   */
  setTarget(target: string): void {
    this.currentTarget = target;
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<GestureConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private setupListeners(): void {
    if (!this.element) return;

    // Touch events
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd);
    this.element.addEventListener('touchcancel', this.handleTouchEnd);

    // Mouse fallbacks for desktop testing
    this.element.addEventListener('mousedown', this.handleMouseDown);
    this.element.addEventListener('mousemove', this.handleMouseMove);
    this.element.addEventListener('mouseup', this.handleMouseUp);
  }

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    this.startGesture(e.touches[0].clientX, e.touches[0].clientY);
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (this.isTracking) {
      this.currentPosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    this.endGesture();
  };

  private handleMouseDown = (e: MouseEvent): void => {
    this.startGesture(e.clientX, e.clientY);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.isTracking) {
      this.currentPosition = { x: e.clientX, y: e.clientY };
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    this.endGesture();
  };

  private startGesture(x: number, y: number): void {
    this.isTracking = true;
    this.startTime = Date.now();
    this.startPosition = { x, y };
    this.currentPosition = { x, y };

    // Start hold timer
    this.clearHoldTimer();
    this.holdTimer = setTimeout(() => {
      if (this.isTracking) {
        this.emitIntent('hold');
        this.isTracking = false; // Stop tracking after hold fires
      }
    }, this.config.holdThresholdMs);
  }

  private endGesture(): void {
    if (!this.isTracking) return;

    const duration = Date.now() - this.startTime;
    const dx = this.currentPosition.x - this.startPosition.x;
    const dy = this.currentPosition.y - this.startPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.clearHoldTimer();

    // Determine gesture type
    if (distance > this.config.swipeThresholdPx) {
      this.emitIntent('swipe');
    } else if (duration < this.config.tapThresholdMs) {
      this.emitIntent('tap');
    }
    // Hold already emitted via timer

    this.isTracking = false;
  }

  private emitIntent(action: GestureAction): void {
    const intent: SpatialIntent = {
      action,
      position: this.screenToWorld(this.currentPosition),
      target: this.currentTarget,
      timestamp: this.startTime,
    };

    this.sendToVR(intent);
    this.callbacks.forEach(cb => cb(intent));
  }

  /**
   * Convert screen coordinates to world coordinates
   * Uses config.coordinateSystem ('world' or 'normalized')
   */
  private screenToWorld(screen: { x: number; y: number }): { x: number; y: number; z: number } {
    if (this.config.coordinateSystem === 'normalized') {
      // 0-1 normalized coordinates
      return {
        x: screen.x / window.innerWidth,
        y: 1 - (screen.y / window.innerHeight), // Flip Y for WebGL
        z: 0,
      };
    }

    // World coordinates (meters) via SpatialProjector
    const normalized = {
      x: screen.x / window.innerWidth,
      y: 1 - (screen.y / window.innerHeight), // Flip Y for WebGL
    };
    
    const world = toWorldSpace(normalized.x, normalized.y, this.config.bounds);
    return { x: world.x, y: world.y, z: world.z };
  }

  /**
   * Send intent to VR via postMessage
   */
  private sendToVR(intent: SpatialIntent): void {
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage(intent, this.config.targetUrl);
    }
  }

  private clearHoldTimer(): void {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }
}

export default GestureCapture;
