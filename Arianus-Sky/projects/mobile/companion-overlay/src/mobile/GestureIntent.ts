// GestureIntent Contract
// Mobile ↔ Spatial handoff protocol
// Emits full intent vector, not just triggers

import { GestureType, SARTAN_CONFIDENCE_THRESHOLD } from './companion-feedback-states';

export interface GestureIntent {
  id: string;
  type: GestureType;
  position: WorldPosition;
  direction: Vector3;
  magnitude: number;        // 0-1 normalized
  duration: number;          // ms
  timestamp: number;
  
  context: IntentContext;
  metadata: IntentMetadata;
}

// Distance-based gaze confirm (≥1.5m requires explicit confirm)
export interface GazeConfirm {
  required: boolean;
  distanceMeters: number;
  confirmed: boolean;
}

export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface IntentContext {
  sourceTask: string | null;
  selectionIds: string[];
  transitionPoint: string;
  returnToken: string;        // UUID for stateful return
}

export interface IntentMetadata {
  sourceDevice: 'mobile' | 'spatial';
  confidence: number;         // 0-1, ≥0.85 = valid Sartan gesture
  sessionId: string;
  originatingSurface: string; // e.g., 'home', 'game', 'settings'
  presentationSkin: 'default' | 'menu';  // Patryn: source=menu → menu skin
  gazeConfirm: GazeConfirm;   // Distance-based gaze confirm
}

// State cache for return handoff
export interface CachedContext {
  intent: GestureIntent;
  cachedAt: number;
  expiresAt: number;
}

// Factory
export function createGestureIntent(
  type: GestureType,
  position: WorldPosition,
  direction: Vector3,
  magnitude: number,
  duration: number,
  context: Partial<IntentContext>,
  metadata: Partial<IntentMetadata>
): GestureIntent {
  // Determine presentation skin from context transitionPoint
  // source: 'menu' → presentationSkin: 'menu'
  const presentationSkin: 'default' | 'menu' = 
    context.transitionPoint === 'menu' ? 'menu' : 'default';

  // Determine gaze confirm requirement based on distance
  const distanceMeters = Math.sqrt(
    position.x ** 2 + position.y ** 2 + position.z ** 2
  );
  const gazeConfirm: GazeConfirm = {
    required: distanceMeters >= 1.5,
    distanceMeters,
    confirmed: distanceMeters < 1.5 // Auto-confirm if close
  };

  return {
    id: `intent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    position,
    direction,
    magnitude,
    duration,
    timestamp: Date.now(),
    context: {
      sourceTask: context.sourceTask || null,
      selectionIds: context.selectionIds || [],
      transitionPoint: context.transitionPoint || 'unknown',
      returnToken: context.returnToken || generateReturnToken()
    },
    metadata: {
      sourceDevice: metadata.sourceDevice || 'mobile',
      confidence: metadata.confidence || 1.0,
      sessionId: metadata.sessionId || getSessionId(),
      originatingSurface: metadata.originatingSurface || 'unknown',
      presentationSkin,
      gazeConfirm
    }
  };
}

function generateReturnToken(): string {
  return `rtn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getSessionId(): string {
  // Session ID would be managed by app state
  return 'session_default';
}

// Helper: Check if Sartan gesture meets confidence threshold (80%)
export function isSartanGestureValid(gesture: GestureIntent): boolean {
  const sartanGestures: GestureType[] = ['flick', 'hold', 'circle', 'pinch_sartan'];
  if (!sartanGestures.includes(gesture.type)) {
    return true; // Non-Sartan gestures always valid
  }
  return gesture.metadata.confidence >= SARTAN_CONFIDENCE_THRESHOLD;
}

// Helper: Get rotation delta from discrete 15° events
export function getRotationDelta(degrees: number): number {
  const discreteSteps = Math.floor(degrees / 15);
  return discreteSteps * 15;
}

// ============================================================================
// BIDIRECTIONAL FLOW: VR → Mobile Confirmations
// ============================================================================

// Confirmation response from spatial receiver
export type IntentResolutionStatus = 
  | 'confirmed'   // VR acknowledged, ready to commit
  | 'committed'   // Action completed in VR
  | 'rejected'    // VR rejected (invalid target, out of range, etc.)
  | 'timeout';    // VR didn't respond in time

export interface IntentResolution {
  intentId: string;
  status: IntentResolutionStatus;
  timestamp: number;
  
  // Transform applied (for committed actions)
  transform?: {
    position?: WorldPosition;
    rotation?: { x: number; y: number; z: number; w: number };
    scale?: number;
  };
  
  // Error details (for rejected)
  error?: {
    code: string;
    message: string;
  };
}

// Factory: Create rejection response
export function createRejection(
  intentId: string,
  code: string,
  message: string
): IntentResolution {
  return {
    intentId,
    status: 'rejected',
    timestamp: Date.now(),
    error: { code, message }
  };
}

// Factory: Create confirmation response
export function createConfirmation(
  intentId: string,
  status: 'confirmed' | 'committed',
  transform?: IntentResolution['transform']
): IntentResolution {
  return {
    intentId,
    status,
    timestamp: Date.now(),
    transform
  };
}
