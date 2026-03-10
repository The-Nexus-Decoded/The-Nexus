// Gesture Recognizer - Sartan-style gestures
// Implements: flick, hold, circle, pinch with confidence scoring

import { 
  GestureType, 
  GestureEvent, 
  TIMING,
} from './types';
import { GestureHapticBridge } from './GestureHapticBridge';

export interface Point2D {
  x: number;
  y: number;
  timestamp: number;
}

export interface GestureConfig {
  confidenceThreshold: number;  // 0.8 (80%)
  rotationThreshold: number;   // 15 degrees
  flickVelocityThreshold: number; // px/ms
  pinchDistanceThreshold: number; // px
}

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  confidenceThreshold: 0.8,
  rotationThreshold: 15,
  flickVelocityThreshold: 0.5,
  pinchDistanceThreshold: 50,
};

export class GestureRecognizer {
  private config: GestureConfig;
  private touchStart: Point2D | null = null;
  private touchCurrent: Point2D | null = null;
  private gestureStartTime: number = 0;
  private isTracking: boolean = false;
  private rotationAccumulator: number = 0;
  private lastAngle: number | null = null;
  private circleEventCount: number = 0;
  private haptics: GestureHapticBridge | null = null;

  constructor(config: Partial<GestureConfig> = {}) {
    this.config = { ...DEFAULT_GESTURE_CONFIG, ...config };
  }

  setHaptics(bridge: GestureHapticBridge): void {
    this.haptics = bridge;
  }

  // ==================== Touch Event Handlers ====================

  onTouchStart(x: number, y: number): void {
    this.touchStart = { x, y, timestamp: Date.now() };
    this.touchCurrent = { x, y, timestamp: Date.now() };
    this.gestureStartTime = Date.now();
    this.isTracking = true;
    this.rotationAccumulator = 0;
    this.lastAngle = null;
    this.circleEventCount = 0;
  }

  onTouchMove(x: number, y: number): GestureEvent | null {
    if (!this.isTracking || !this.touchStart) return null;

    const now = Date.now();
    const prev = this.touchCurrent!;
    this.touchCurrent = { x, y, timestamp: now };

    // Calculate rotation (circle gesture)
    const rotation = this.calculateRotation(prev, this.touchCurrent);
    if (rotation !== null) {
      this.rotationAccumulator += Math.abs(rotation);
      
      // Emit rotation event at 15° thresholds
      const degrees = this.radiansToDegrees(this.rotationAccumulator);
      const threshold = this.config.rotationThreshold;
      
      if (degrees >= this.circleEventCount * threshold + threshold) {
        this.circleEventCount++;
        
        // Trigger haptic feedback for rotation
        if (this.haptics) {
          this.haptics.processGesture('rotate', this.config.confidenceThreshold);
        }

        return {
          type: 'rotate',
          timestamp: now,
          confidence: this.calculateRotationConfidence(degrees),
        };
      }
    }

    return null;
  }

  onTouchEnd(): GestureEvent | null {
    if (!this.isTracking || !this.touchStart || !this.touchCurrent) {
      this.reset();
      return null;
    }

    const duration = Date.now() - this.gestureStartTime;
    const { x: sx, y: sy } = this.touchStart;
    const { x: ex, y: ey } = this.touchCurrent;
    const distance = this.distance(sx, sy, ex, ey);
    const velocity = distance / Math.max(duration, 1);

    let gesture: GestureEvent | null = null;

    // Long press detection
    if (duration >= TIMING.longPressThreshold) {
      gesture = {
        type: 'long_press',
        timestamp: Date.now(),
        confidence: this.calculateLongPressConfidence(duration),
      };
    }
    // Double-tap detection
    else if (distance < 20 && duration < 200) {
      gesture = {
        type: 'double_tap',
        timestamp: Date.now(),
        confidence: 1.0,
      };
    }
    // Flick detection
    else if (velocity >= this.config.flickVelocityThreshold) {
      gesture = {
        type: 'double_tap', // Flick maps to double-tap intent
        timestamp: Date.now(),
        confidence: this.calculateFlickConfidence(velocity),
      };
    }

    this.reset();
    return gesture;
  }

  // ==================== Math Helpers ====================

  private calculateRotation(p1: Point2D, p2: Point2D): number | null {
    if (!this.lastAngle) {
      this.lastAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      return null;
    }

    const currentAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    let delta = currentAngle - this.lastAngle;
    
    // Handle angle wrapping
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;

    this.lastAngle = currentAngle;
    return delta;
  }

  private radiansToDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  private distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  // ==================== Confidence Calculations ====================

  private calculateRotationConfidence(degrees: number): number {
    // More rotation = higher confidence
    const minDegrees = this.config.rotationThreshold;
    const confidence = Math.min(degrees / (minDegrees * 3), 1.0);
    return Math.max(confidence, this.config.confidenceThreshold);
  }

  private calculateLongPressConfidence(durationMs: number): number {
    // Longer press = higher confidence (up to 2s)
    const minDuration = TIMING.longPressThreshold;
    const confidence = Math.min(durationMs / 2000, 1.0);
    return Math.max(confidence, this.config.confidenceThreshold);
  }

  private calculateFlickConfidence(velocity: number): number {
    // Higher velocity = higher confidence
    const threshold = this.config.flickVelocityThreshold;
    const confidence = Math.min(velocity / (threshold * 3), 1.0);
    return Math.max(confidence, this.config.confidenceThreshold);
  }

  // ==================== State ====================

  private reset(): void {
    this.touchStart = null;
    this.touchCurrent = null;
    this.isTracking = false;
    this.rotationAccumulator = 0;
    this.lastAngle = null;
    this.circleEventCount = 0;
  }

  isGestureTracking(): boolean {
    return this.isTracking;
  }
}

// ==================== Pinch Recognizer ====================

export interface PinchState {
  isPinching: boolean;
  scale: number;
  center: Point2D;
}

export class PinchRecognizer {
  private initialDistance: number = 0;
  private isPinching: boolean = false;
  private lastScale: number = 1.0;

  onTouchStart(touch1: Point2D, touch2: Point2D): void {
    this.initialDistance = this.distance(touch1, touch2);
    this.isPinching = true;
    this.lastScale = 1.0;
  }

  onTouchMove(touch1: Point2D, touch2: Point2D): PinchState | null {
    if (!this.isPinching || this.initialDistance === 0) return null;

    const currentDistance = this.distance(touch1, touch2);
    const scale = currentDistance / this.initialDistance;
    this.lastScale = scale;

    const center: Point2D = {
      x: (touch1.x + touch2.x) / 2,
      y: (touch1.y + touch2.y) / 2,
      timestamp: Date.now(),
    };

    return {
      isPinching: this.isPinching,
      scale,
      center,
    };
  }

  onTouchEnd(): PinchState | null {
    if (!this.isPinching) return null;

    this.isPinching = false;
    const result: PinchState = {
      isPinching: false,
      scale: this.lastScale,
      center: { x: 0, y: 0, timestamp: Date.now() },
    };

    this.initialDistance = 0;
    this.lastScale = 1.0;

    return result;
  }

  private distance(p1: Point2D, p2: Point2D): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }
}
