// Gesture Types & Configuration
// Mobile → XR intent handoff contract
// Implements: Confidence Threshold, Throttle, Session State, Semantics

import { SARTAN_CONFIDENCE_THRESHOLD } from '../../../companion-feedback-states';

// === XR Gesture Event (WebSocket Payload from XR) ===

export interface XRThermal {
  temperature: number;
  tier: 0 | 1 | 2 | 3 | 4;  // 0=unspecified, 1=cool, 2=warm, 3=hot, 4=critical
  timestamp: number;
}

export interface XRGestureIntent {
  action: 'move' | 'rotate' | 'scale' | 'select';
  target: string;
  source: 'gesture' | 'menu' | 'depth_handle';
  confidence: number;           // 0.0-1.0
  confidence_override_threshold: number; // Per-gesture override threshold
  position?: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
}

export interface GestureEvent {
  gesture_id: string;
  intent: XRGestureIntent;
  thermal: XRThermal;
  timestamp: number;
}

// === Action→Effect Mapping (from xr-gesture-receiver.ts) ===

export const ACTION_EFFECT_MAP: Record<XRGestureIntent['action'], string> = {
  move: 'ghost_wireframe',
  rotate: 'rotation_ring',
  scale: 'scale_handle',
  select: 'highlight_pulse',
} as const;

// === Configuration ===

export const GESTURE_CONFIG = {
  // Confidence threshold for valid gesture (≥80% = valid Sartan)
  CONFIDENCE_THRESHOLD: SARTAN_CONFIDENCE_THRESHOLD, // 0.80
  
  // 10Hz throttle: min 100ms between gesture emissions
  THROTTLE_INTERVAL_MS: 100,
  
  // Undo window: 3 seconds to undo
  UNDO_WINDOW_MS: 3000,
  
  // Intent queue depth: 3-deep FIFO
  INTENT_QUEUE_DEPTH: 3,
  
  // Session expiry: 5 minutes idle
  SESSION_EXPIRY_MS: 5 * 60 * 1000,
} as const;

// === XRpcError Codes ===

export enum XRpcErrorCode {
  // Session errors
  SESSION_EXPIRED = -32001,
  SESSION_NOT_FOUND = -32002,
  
  // Gesture errors
  OUT_OF_BOUNDS = -32101,
  THROTTLED = -32102,
  GESTURE_UNRECOGNIZED = -32103,
  CONFIDENCE_TOO_LOW = -32104,
  
  // Connection errors
  CONNECTION_LOST = -32201,
  CONNECTION_REFUSED = -32202,
  TIMEOUT = -32203,
}

export interface XRpcError {
  code: XRpcErrorCode;
  message: string;
  data?: {
    gesture_id?: string;
    timestamp?: number;
    retryAfter?: number;
  };
}

// === ImmersionContext (Session State) ===

export interface ImmersionContext {
  sessionId: string;
  state: SessionState;
  lastGestureTime: number;
  expiresAt: number;
  reconnectAttempts: number;
}

export function createImmersionContext(sessionId: string): ImmersionContext {
  const now = Date.now();
  return {
    sessionId,
    state: SessionState.ACTIVE,
    lastGestureTime: now,
    expiresAt: now + GESTURE_CONFIG.SESSION_EXPIRY_MS,
    reconnectAttempts: 0,
  };
}

export function updateImmersionContext(
  ctx: ImmersionContext,
  action: 'gesture' | 'idle' | 'expire' | 'reconnect' | 'disconnect'
): ImmersionContext {
  const now = Date.now();
  
  switch (action) {
    case 'gesture':
      return {
        ...ctx,
        state: SessionState.ACTIVE,
        lastGestureTime: now,
        expiresAt: now + GESTURE_CONFIG.SESSION_EXPIRY_MS,
      };
    case 'idle':
      return {
        ...ctx,
        state: SessionState.IDLE,
      };
    case 'expire':
      return {
        ...ctx,
        state: SessionState.EXPIRED,
      };
    case 'reconnect':
      return {
        ...ctx,
        state: SessionState.ACTIVE,
        reconnectAttempts: ctx.reconnectAttempts + 1,
      };
    case 'disconnect':
      return {
        ...ctx,
        state: SessionState.DISCONNECTED,
      };
  }
}

// === Swipe Actions (Gesture → Action Mapping) ===

export type SwipeDirection = 'swipe_left' | 'swipe_right' | 'swipe_up' | 'swipe_down';

export function mapSwipeToAction(
  direction: SwipeVector['direction'],
  handedness: Handedness
): SwipeDirection {
  // Account for handedness: Patryn (right hand) vs Sartan (left hand)
  if (direction === 'left' || direction === 'right') {
    // For Patryn: natural left/right
    // For Sartan: inverted (mirror mode)
    if (handedness === Handedness.SARTAN) {
      return direction === 'left' ? 'swipe_right' : 'swipe_left';
    }
    return `swipe_${direction}` as SwipeDirection;
  }
  
  // Vertical swipes are the same regardless of handedness
  return `swipe_${direction}` as SwipeDirection;
}

// === Confidence Threshold (≥0.85 auto-commit) ===

// Auto-commit threshold: ≥0.85 = immediate commit
// Below threshold: queue for resolution or reject
export const AUTO_COMMIT_CONFIDENCE = 0.85;

export function shouldAutoCommit(confidence: number): boolean {
  return confidence >= AUTO_COMMIT_CONFIDENCE;
}

export function getConfidenceTier(confidence: number): 'auto' | 'review' | 'reject' {
  if (confidence >= AUTO_COMMIT_CONFIDENCE) return 'auto';
  if (confidence >= GESTURE_CONFIG.CONFIDENCE_THRESHOLD) return 'review';
  return 'reject';
}

// === Session State ===

export enum SessionState {
  ACTIVE = 'ACTIVE',
  IDLE = 'IDLE',
  EXPIRED = 'EXPIRED',
  DISCONNECTED = 'DISCONNECTED'
}

// === Gesture Semantics: Cast vs Charge ===

// CAST: Quick flick gesture → immediate action dispatch
// Duration: <200ms, Magnitude: >0.7
export interface CastGesture {
  type: 'cast';
  action: string;
  target: string;
  position: Vector3;
  timestamp: number;
}

// CHARGE: Hold gesture → build up before dispatch
// Duration: 500-2000ms, builds intensity over time
export interface ChargeGesture {
  type: 'charge';
  action: string;
  target: string;
  position: Vector3;
  intensity: number; // 0-1, builds over hold duration
  timestamp: number;
  released: boolean; // true when finger lifted
}

// === Swipe Direction Vectors ===

// Patryn (right hand): left→right = positive X
// Sartan (left hand): right→left = negative X
export enum Handedness {
  PATRYN = 'patryn', // Right hand
  SARTAN = 'sartan'  // Left hand
}

export interface SwipeVector {
  direction: 'left' | 'right' | 'up' | 'down';
  magnitude: number; // 0-1 normalized
  handedness: Handedness;
}

// Map swipe to direction based on handedness
export function getSwipeDirection(
  dx: number, 
  dy: number, 
  handedness: Handedness = Handedness.PATRYN
): SwipeVector {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  
  // Horizontal vs Vertical
  if (absX > absY) {
    // For Patryn: left→right is positive (swipe_right)
    // For Sartan: right→left is "natural" (still swipe_left in UI terms)
    const isRight = handedness === Handedness.PATRYN ? dx > 0 : dx < 0;
    return {
      direction: isRight ? 'right' : 'left',
      magnitude: Math.min(absX / 100, 1), // Normalize, assume 100px = max
      handedness
    };
  } else {
    const isUp = dy < 0; // Screen Y is inverted
    return {
      direction: isUp ? 'up' : 'down',
      magnitude: Math.min(absY / 100, 1),
      handedness
    };
  }
}

// === Throttle Helper ===

let lastEmissionTime = 0;

export function canEmitGesture(): boolean {
  const now = Date.now();
  if (now - lastEmissionTime >= GESTURE_CONFIG.THROTTLE_INTERVAL_MS) {
    lastEmissionTime = now;
    return true;
  }
  return false;
}

// === Type Exports ===

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type GestureIntentPayload = CastGesture | ChargeGesture;
