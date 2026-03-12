// GestureRecognizer - Touch/Hand-Tracking input → GestureIntent
// Implements:
// - Touch gestures: tap, hold, swipe (4 dirs), pinch, rotate
// - XR Hand-tracking (v1.0): pinch, grab, point, palm_push, two_hand_pinch, snap_turn, air_tap

import { 
  GestureIntent, 
  GestureType, 
  Vector2,
  SwipeMetadata,
  HoldMetadata,
  PinchMetadata,
  RotateMetadata,
  GrabMetadata,
  PointMetadata,
  PalmPushMetadata,
  TwoHandPinchMetadata,
  SnapTurnMetadata,
  AirTapMetadata
} from './GestureBridge';

// === Gesture Thresholds (per spec) ===
const TAP_MIN_MS = 50;
const TAP_MAX_MS = 200;
const HOLD_MIN_MS = 500;
const SWIPE_THRESHOLD_PX = 100;
const SWIPE_MAX_MS = 300;
const PINCH_MIN_DELTA = 10;
const ROTATE_MIN_DELTA = 5; // degrees

interface TouchPoint {
  id: number;
  position: Vector2;
  startTime: number;
  startPosition: Vector2;
}

interface TouchState {
  active: Map<number, TouchPoint>;
  startTime: number;
}

export class GestureRecognizer {
  private touchState: TouchState = {
    active: new Map(),
    startTime: 0
  };

  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private onIntent: (intent: GestureIntent) => void;

  constructor(onIntent: (intent: GestureIntent) => void) {
    this.onIntent = onIntent;
  }

  // === Touch Event Handlers ===

  onTouchStart(touches: { identifier: number; pageX: number; pageY: number }[]): void {
    const now = Date.now();
    
    if (this.touchState.active.size === 0) {
      this.touchState.startTime = now;
    }

    for (const touch of touches) {
      this.touchState.active.set(touch.identifier, {
        id: touch.identifier,
        position: { x: touch.pageX, y: touch.pageY },
        startTime: now,
        startPosition: { x: touch.pageX, y: touch.pageY }
      });
    }

    // Start hold timer if single touch
    if (touches.length === 1) {
      this.startHoldTimer(touches[0].identifier);
    }
  }

  onTouchMove(touches: { identifier: number; pageX: number; pageY: number }[]): void {
    // Cancel hold on move (unless it's a deliberate hold gesture)
    this.cancelHoldTimer();

    for (const touch of touches) {
      const point = this.touchState.active.get(touch.identifier);
      if (point) {
        point.position = { x: touch.pageX, y: touch.pageY };
      }
    }

    // Handle multi-touch gestures (pinch/rotate)
    if (touches.length === 2) {
      this.handlePinchRotate(touches);
    }
  }

  onTouchEnd(touches: { identifier: number; pageX: number; pageY: number }[]): void {
    const now = Date.now();

    for (const touch of touches) {
      const point = this.touchState.active.get(touch.identifier);
      if (!point) continue;

      const duration = now - point.startTime;
      const deltaX = touch.pageX - point.startPosition.x;
      const deltaY = touch.pageY - point.startPosition.y;

      // Normalize position to 0-1 range (assuming screen width/height)
      const normalizedPos: Vector2 = {
        x: Math.min(1, Math.max(0, touch.pageX / window.innerWidth)),
        y: Math.min(1, Math.max(0, touch.pageY / window.innerHeight))
      };

      // Determine gesture type
      if (duration >= TAP_MIN_MS && duration <= TAP_MAX_MS) {
        // TAP
        this.emitIntent('tap', normalizedPos, now, {});
      } else if (duration > TAP_MAX_MS && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        // HOLD released
        this.emitIntent('hold', normalizedPos, now, { duration } as HoldMetadata);
      } else if (duration < SWIPE_MAX_MS) {
        // SWIPE
        const swipe = this.detectSwipe(deltaX, deltaY);
        if (swipe) {
          this.emitIntent('swipe', normalizedPos, now, swipe);
        }
      }

      this.touchState.active.delete(touch.identifier);
    }

    this.cancelHoldTimer();
  }

  // === Gesture Detection ===

  private detectSwipe(deltaX: number, deltaY: number): SwipeMetadata | null {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > SWIPE_THRESHOLD_PX && absX > absY) {
      return {
        direction: deltaX > 0 ? 'right' : 'left',
        deltaX,
        deltaY
      };
    }

    if (absY > SWIPE_THRESHOLD_PX && absY > absX) {
      return {
        direction: deltaY < 0 ? 'up' : 'down',
        deltaX,
        deltaY
      };
    }

    return null;
  }

  private lastPinchDistance = 0;
  private lastPinchCenter: Vector2 | null = null;
  private lastRotationAngle = 0;

  private handlePinchRotate(touches: { identifier: number; pageX: number; pageY: number }[]): void {
    if (touches.length !== 2) return;

    const [a, b] = touches;
    
    // Calculate center
    const center: Vector2 = {
      x: (a.pageX + b.pageX) / 2 / window.innerWidth,
      y: (a.pageY + b.pageY) / 2 / window.innerHeight
    };

    // Calculate distance
    const dx = b.pageX - a.pageX;
    const dy = b.pageY - a.pageY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate angle (in degrees)
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // PINCH detection
    if (this.lastPinchDistance > 0) {
      const deltaDistance = distance - this.lastPinchDistance;
      
      if (Math.abs(deltaDistance) > PINCH_MIN_DELTA) {
        const scale = distance / this.lastPinchDistance;
        this.emitIntent('pinch', center, Date.now(), {
          scale,
          center,
          deltaDistance
        } as PinchMetadata);
      }
    }
    this.lastPinchDistance = distance;

    // ROTATE detection
    if (this.lastRotationAngle !== 0) {
      const deltaAngle = angle - this.lastRotationAngle;
      
      if (Math.abs(deltaAngle) > ROTATE_MIN_DELTA) {
        this.emitIntent('rotate', center, Date.now(), {
          angle: deltaAngle,
          center,
          deltaAngle
        } as RotateMetadata);
      }
    }
    this.lastRotationAngle = angle;
    this.lastPinchCenter = center;
  }

  // === Hold Timer ===

  private startHoldTimer(touchId: number): void {
    this.cancelHoldTimer();
    
    this.holdTimer = setTimeout(() => {
      // Emit hold intent while still held (for continuous feedback)
      const point = this.touchState.active.get(touchId);
      if (point) {
        const duration = Date.now() - point.startTime;
        const normalizedPos: Vector2 = {
          x: point.position.x / window.innerWidth,
          y: point.position.y / window.innerHeight
        };
        
        this.emitIntent('hold', normalizedPos, Date.now(), { 
          duration,
          active: true 
        } as HoldMetadata & { active: boolean });
      }
    }, HOLD_MIN_MS);
  }

  private cancelHoldTimer(): void {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  // === Intent Emission ===

  private emitIntent(
    type: GestureType, 
    position: Vector2, 
    timestamp: number, 
    metadata: Record<string, unknown>
  ): void {
    const intent: GestureIntent = {
      type,
      position,
      timestamp,
      metadata
    };

    this.onIntent(intent);
  }

  // === Cleanup ===

  reset(): void {
    this.cancelHoldTimer();
    this.touchState.active.clear();
    this.lastPinchDistance = 0;
    this.lastRotationAngle = 0;
    this.lastPinchCenter = null;
    this.resetHandState();
  }

  // === XR Hand Tracking (v1.0 spec) ===

  private handState: {
    left: HandData | null;
    right: HandData | null;
  } = { left: null, right: null };

  private readonly PINCH_THRESHOLD = 0.5;
  private readonly GRAB_THRESHOLD = 0.7;
  private readonly SNAP_TURN_THRESHOLD = 45; // degrees

  interface HandData {
    pinchStrength: number;
    grabStrength: number;
    wristRotation: number; // degrees
    indexExtended: boolean;
    palmDirection: Vector2;
    lastUpdate: number;
  }

  // Process XR hand tracking input from WebXR/Quest
  onHandTrackingUpdate(
    hand: 'left' | 'right',
    data: {
      pinchStrength: number;
      grabStrength: number;
      wristRotation: number;
      indexExtended: boolean;
      palmDirection: Vector2;
    }
  ): void {
    const now = Date.now();
    const prev = this.handState[hand];
    const newData: HandData = { ...data, lastUpdate: now };

    // PINCH: thumb + index tip meet
    if (data.pinchStrength >= this.PINCH_THRESHOLD && (!prev || prev.pinchStrength < this.PINCH_THRESHOLD)) {
      this.emitIntent('pinch', { x: 0.5, y: 0.5 }, now, { hand } as unknown as PinchMetadata);
    }

    // GRAB: full hand wrap
    if (data.grabStrength >= this.GRAB_THRESHOLD && (!prev || prev.grabStrength < this.GRAB_THRESHOLD)) {
      this.emitIntent('grab', { x: 0.5, y: 0.5 }, now, { 
        hand, 
        grabStrength: data.grabStrength 
      } as unknown as GrabMetadata);
    }

    // POINT: index extended, others curled
    if (data.indexExtended && (!prev || !prev.indexExtended)) {
      this.emitIntent('point', { x: 0.5, y: 0.5 }, now, { hand, cursorPosition: { x: 0, y: 0 } } as unknown as PointMetadata);
    }

    // PALM PUSH: open palm forward (negative z in VR coords)
    if (data.palmDirection.y > 0.5 && (!prev || prev.palmDirection.y <= 0.5)) {
      this.emitIntent('palm_push', { x: 0.5, y: 0.5 }, now, {
        hand,
        pushDirection: data.palmDirection,
        pushDistance: 0
      } as unknown as PalmPushMetadata);
    }

    // SNAP TURN: wrist rotation > 45°
    if (prev) {
      const deltaRotation = Math.abs(data.wristRotation - prev.wristRotation);
      if (deltaRotation > this.SNAP_TURN_THRESHOLD) {
        const direction = data.wristRotation > prev.wristRotation ? 'right' : 'left';
        this.emitIntent('snap_turn', { x: 0.5, y: 0.5 }, now, {
          hand,
          rotationAngle: deltaRotation,
          direction
        } as unknown as SnapTurnMetadata);
      }
    }

    // AIR TAP: quick pinch release
    if (prev && prev.pinchStrength >= this.PINCH_THRESHOLD && data.pinchStrength < this.PINCH_THRESHOLD) {
      const tapDuration = now - prev.lastUpdate;
      if (tapDuration < 300) {
        this.emitIntent('air_tap', { x: 0.5, y: 0.5 }, now, {
          hand,
          tapPosition: { x: 0, y: 0 }
        } as unknown as AirTapMetadata);
      }
    }

    this.handState[hand] = newData;
  }

  // Two-hand pinch for scale/zoom
  onTwoHandPinchUpdate(data: {
    leftPinch: boolean;
    rightPinch: boolean;
    scale: number;
    center: Vector2;
  }): void {
    this.emitIntent('two_hand_pinch', data.center, Date.now(), data as unknown as TwoHandPinchMetadata);
  }

  private resetHandState(): void {
    this.handState = { left: null, right: null };
  }
}
