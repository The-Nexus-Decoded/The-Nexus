/**
 * Spatial Gesture Bridge - Mobile to XR
 * Translation layer normalizing touch gestures to 6DOF spatial intent vectors
 * 
 * @author Paithan
 * @date 2026-03-09
 */

import { 
  Gesture, 
  GestureState, 
  SpatialIntent, 
  IntentAction,
  Vector3,
  ScreenPoint 
} from './types';

// ============================================================================
// GESTURE RECOGNITION
// ============================================================================

/**
 * Maps native touch gestures to semantic spatial intents
 */
export class GestureRecognizer {
  private activeGestures: Map<number, Gesture> = new Map();
  private lastPinchDistance: number = 0;
  private lastRotationAngle: number = 0;

  /**
   * Process touch start event
   */
  onTouchStart(touchId: number, point: ScreenPoint, timestamp: number): SpatialIntent | null {
    const gesture: Gesture = {
      id: touchId,
      startPoint: point,
      currentPoint: point,
      startTime: timestamp,
      lastMoveTime: timestamp,
      velocity: 0,
      type: 'unknown',
      state: 'began'
    };
    
    this.activeGestures.set(touchId, gesture);
    return null; // Waiting for movement to determine gesture type
  }

  /**
   * Process touch move event - determines gesture type from movement
   */
  onTouchMove(
    touchId: number, 
    point: ScreenPoint, 
    timestamp: number,
    activeTouches: Map<number, ScreenPoint>
  ): SpatialIntent | null {
    const gesture = this.activeGestures.get(touchId);
    if (!gesture) return null;

    gesture.currentPoint = point;
    const dx = point.x - gesture.startPoint.x;
    const dy = point.y - gesture.startPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const elapsed = timestamp - gesture.startTime;

    // Determine gesture type based on movement characteristics
    if (gesture.type === 'unknown') {
      if (distance < 10) {
        // Minimal movement - might be tap or long press
        if (elapsed > 500) {
          gesture.type = 'long_press';
          gesture.state = 'recognized';
        }
      } else if (distance > 20) {
        // Significant movement - drag
        gesture.type = 'drag';
        gesture.state = 'recognized';
      }
    }

    // Handle multi-touch gestures
    if (activeTouches.size === 2) {
      const touches = Array.from(activeTouches.values());
      const currentPinchDistance = this.getDistance(touches[0], touches[1]);
      const currentRotationAngle = this.getAngle(touches[0], touches[1]);

      if (this.lastPinchDistance > 0) {
        const pinchDelta = currentPinchDistance / this.lastPinchDistance;
        
        // Pinch detected
        if (Math.abs(pinchDelta - 1.0) > 0.05) {
          gesture.type = 'pinch';
          gesture.state = 'recognized';
          return this.createIntent(gesture, 'SCALE', {
            factor: pinchDelta,
            center: this.midpoint(touches[0], touches[1])
          }, timestamp);
        }

        // Rotation detected
        if (Math.abs(currentRotationAngle - this.lastRotationAngle) > 5) {
          gesture.type = 'twist';
          gesture.state = 'recognized';
          return this.createIntent(gesture, 'ROTATE', {
            angle: currentRotationAngle - this.lastRotationAngle,
            axis: [0, 1, 0] // Y-axis rotation for now
          }, timestamp);
        }
      }

      this.lastPinchDistance = currentPinchDistance;
      this.lastRotationAngle = currentRotationAngle;
    }

    // Emit drag intent
    if (gesture.type === 'drag' && gesture.state === 'recognized') {
      return this.createIntent(gesture, 'TRANSLATE', {
        delta: [dx, -dy, 0], // Invert Y for screen coords
        position: [point.x, point.y, 0]
      }, timestamp);
    }

    return null;
  }

  /**
   * Process touch end event
   */
  onTouchEnd(
    touchId: number, 
    point: ScreenPoint, 
    timestamp: number,
    activeTouches: Map<number, ScreenPoint>
  ): SpatialIntent | null {
    const gesture = this.activeGestures.get(touchId);
    if (!gesture) return null;

    const elapsed = timestamp - gesture.startTime;
    const dx = point.x - gesture.startPoint.x;
    const dy = point.y - gesture.startPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let intent: SpatialIntent | null = null;

    // Tap detection (short duration, minimal movement)
    if (elapsed < 250 && distance < 15) {
      intent = this.createIntent(gesture, 'SELECT', {
        position: [point.x, point.y, 0]
      }, timestamp);
    }

    // Long press - emit grab
    if (gesture.type === 'long_press' || (elapsed > 500 && distance < 20)) {
      intent = this.createIntent(gesture, 'GRAB', {
        position: [gesture.startPoint.x, gesture.startPoint.y, 0]
      }, timestamp);
    }

    // Release on any end
    const releaseIntent: SpatialIntent = {
      action: 'RELEASE',
      targetId: gesture.targetId,
      vector: {},
      timestamp,
      confidence: 1.0
    };

    this.activeGestures.delete(touchId);
    this.lastPinchDistance = 0;
    this.lastRotationAngle = 0;

    return intent || releaseIntent;
  }

  private createIntent(
    gesture: Gesture, 
    action: IntentAction,
    vector: Record<string, unknown>,
    timestamp: number
  ): SpatialIntent {
    return {
      action,
      targetId: gesture.targetId,
      vector: vector as SpatialIntent['vector'],
      timestamp,
      confidence: 0.95
    };
  }

  private getDistance(p1: ScreenPoint, p2: ScreenPoint): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getAngle(p1: ScreenPoint, p2: ScreenPoint): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
  }

  private midpoint(p1: ScreenPoint, p2: ScreenPoint): Vector3 {
    return [
      (p1.x + p2.x) / 2,
      (p1.y + p2.y) / 2,
      0
    ];
  }
}

// ============================================================================
// SPATIAL PROJECTION - Screen to World
// ============================================================================

export class SpatialProjector {
  private viewMatrix: Float32Array = new Float32Array(16);
  private projectionMatrix: Float32Array = new Float32Array(16);
  private cameraIntrinsics: { fx: number; fy: number; cx: number; cy: number } = {
    fx: 500, fy: 500, cx: 0.5, cy: 0.5 // defaults
  };

  /**
   * Update camera matrices from XR session
   */
  updateCameraMatrices(view: Float32Array, projection: Float32Array): void {
    this.viewMatrix.set(view);
    this.projectionMatrix.set(projection);
  }

  /**
   * Update camera intrinsics
   */
  setIntrinsics(fx: number, fy: number, cx: number, cy: number): void {
    this.cameraIntrinsics = { fx, fy, cx, cy };
  }

  /**
   * Project screen point to world ray
   */
  screenToWorldRay(screenX: number, screenY: number): { origin: Vector3; direction: Vector3 } {
    // Normalized device coordinates (-1 to 1)
    const ndcX = (screenX * 2) - 1;
    const ndcY = 1 - (screenY * 2); // Flip Y

    // Inverse projection
    const invProj = this.invertMatrix(this.projectionMatrix);
    const invView = this.invertMatrix(this.viewMatrix);

    // Near point in NDC
    const nearPoint = this.multiplyMatrixVector(invProj, [ndcX, ndcY, -1, 1]);
    const farPoint = this.multiplyMatrixVector(invProj, [ndcX, ndcY, 1, 1]);

    // Perspective division
    const near = [nearPoint[0]/nearPoint[3], nearPoint[1]/nearPoint[3], nearPoint[2]/nearPoint[3]];
    const far = [farPoint[0]/farPoint[3], farPoint[1]/farPoint[3], farPoint[2]/farPoint[3]];

    // Transform to world space
    const worldNear = this.multiplyMatrixVector(invView, [...near, 1]);
    const worldFar = this.multiplyMatrixVector(invView, [...far, 1]);

    const direction: Vector3 = [
      worldFar[0] - worldNear[0],
      worldFar[1] - worldNear[1],
      worldFar[2] - worldNear[2]
    ];
    
    const len = Math.sqrt(direction[0]**2 + direction[1]**2 + direction[2]**2);
    direction[0] /= len;
    direction[1] /= len;
    direction[2] /= len;

    return {
      origin: [worldNear[0], worldNear[1], worldNear[2]],
      direction
    };
  }

  /**
   * Convert screen delta to world delta (approximate)
   */
  screenDeltaToWorldDelta(dx: number, dy: number, depth: number = 1.0): Vector3 {
    const scale = depth * 0.001; // Adjust based on FOV
    return [dx * scale, -dy * scale, 0];
  }

  private invertMatrix(m: Float32Array): Float32Array {
    const inv = new Float32Array(16);
    const det = this.determinant4x4(m);
    
    if (Math.abs(det) < 1e-10) return inv;

    // Simplified inversion for perspective matrices
    // Full inversion would use cofactor expansion
    inv[0] = 1/m[0]; inv[1] = 0; inv[2] = 0; inv[3] = 0;
    inv[4] = 0; inv[5] = 1/m[5]; inv[6] = 0; inv[7] = 0;
    inv[8] = 0; inv[9] = 0; inv[10] = 1/m[10]; inv[11] = 0;
    inv[12] = -m[12]/m[0]; inv[13] = -m[13]/m[5]; inv[14] = -m[14]/m[10]; inv[15] = 1;

    return inv;
  }

  private determinant4x4(m: Float32Array): number {
    return m[0] * (m[5]*m[10]*m[15] - m[5]*m[11]*m[14] - m[9]*m[6]*m[15] + 
           m[9]*m[7]*m[14] + m[13]*m[6]*m[11] - m[13]*m[7]*m[10]) -
           m[1] * (m[4]*m[10]*m[15] - m[4]*m[11]*m[14] - m[8]*m[6]*m[15] + 
           m[8]*m[7]*m[14] + m[12]*m[6]*m[11] - m[12]*m[7]*m[10]) +
           m[2] * (m[4]*m[9]*m[15] - m[4]*m[11]*m[13] - m[8]*m[5]*m[15] + 
           m[8]*m[7]*m[13] + m[12]*m[5]*m[11] - m[12]*m[7]*m[9]) -
           m[3] * (m[4]*m[9]*m[14] - m[4]*m[10]*m[13] - m[8]*m[5]*m[14] + 
           m[8]*m[6]*m[13] + m[12]*m[5]*m[10] - m[12]*m[6]*m[9]);
  }

  private multiplyMatrixVector(m: Float32Array, v: number[]): number[] {
    return [
      m[0]*v[0] + m[4]*v[1] + m[8]*v[2] + m[12]*v[3],
      m[1]*v[0] + m[5]*v[1] + m[9]*v[2] + m[13]*v[3],
      m[2]*v[0] + m[6]*v[1] + m[10]*v[2] + m[14]*v[3],
      m[3]*v[0] + m[7]*v[1] + m[11]*v[2] + m[15]*v[3]
    ];
  }
}

// ============================================================================
// INTENT EMITTER
// ============================================================================

export class IntentEmitter {
  private ws: WebSocket | null = null;
  private intentQueue: SpatialIntent[] = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private url: string;

  constructor(url: string = 'ws://localhost:8080/spatial') {
    this.url = url;
  }

  /**
   * Connect to XR runtime
   */
  connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('[SpatialGestureBridge] Connected to XR runtime');
        this.reconnectAttempts = 0;
        this.flushQueue();
      };

      this.ws.onclose = () => {
        console.log('[SpatialGestureBridge] Disconnected from XR runtime');
        this.attemptReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[SpatialGestureBridge] WebSocket error:', err);
      };
    } catch (e) {
      console.warn('[SpatialGestureBridge] WebSocket unavailable, queuing intents');
    }
  }

  /**
   * Emit spatial intent to XR layer
   */
  emit(intent: SpatialIntent): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(intent));
    } else {
      this.intentQueue.push(intent);
    }
  }

  /**
   * Disconnect from XR runtime
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private flushQueue(): void {
    while (this.intentQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const intent = this.intentQueue.shift();
      if (intent) this.ws.send(JSON.stringify(intent));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SpatialGestureBridge] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    setTimeout(() => {
      console.log(`[SpatialGestureBridge] Reconnection attempt ${this.reconnectAttempts}`);
      this.connect();
    }, delay);
  }
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export type { SpatialIntent, IntentAction, Vector3, ScreenPoint, GestureState } from './types';
