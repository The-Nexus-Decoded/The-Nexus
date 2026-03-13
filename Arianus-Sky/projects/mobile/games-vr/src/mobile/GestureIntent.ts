// GestureIntent Contract
// Mobile ↔ Spatial handoff protocol
// Emits full intent vector, not just triggers

import { GestureType, TIMING } from './types';

// Sartan confidence threshold (80%)
const SARTAN_CONFIDENCE_THRESHOLD = 0.8;

// Patryn gesture → action mapping
export const PATRYN_GESTURE_ACTIONS: Record<string, string> = {
  'tap': 'menu',
  'swipe': 'navigate',
  'hold': 'back'
};

// Sartan gesture → action mapping  
export const SARTAN_GESTURE_ACTIONS: Record<string, string> = {
  'double_tap': 'select',
  'rotate': 'rotate',
  'long_press': 'grab',
  'mode_toggle': 'mode_toggle'
};

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

// Patryn gesture types
const PATRYN_GESTURES: GestureType[] = ['tap', 'swipe', 'hold'];

// Helper: Determine gesture faction (Patryn vs Sartan)
export function getGestureFaction(type: GestureType): 'patryn' | 'sartan' {
  return PATRYN_GESTURES.includes(type) ? 'patryn' : 'sartan';
}

// Helper: Get visual skin based on faction
// Patryn = menu skin, Sartan = default skin
export function getVisualSkinForFaction(faction: 'patryn' | 'sartan'): 'menu' | 'default' {
  return faction === 'patryn' ? 'menu' : 'default';
}

// Helper: Get action for gesture (menu/navigate/back for Patryn)
export function getGestureAction(type: GestureType): string {
  const faction = getGestureFaction(type);
  if (faction === 'patryn') {
    return PATRYN_GESTURE_ACTIONS[type] || 'unknown';
  }
  return SARTAN_GESTURE_ACTIONS[type] || 'unknown';
}

// Helper: Check if Sartan gesture meets confidence threshold (80%)
// Sartan gestures: rotate (circle), long_press (hold), double_tap (flick)
export function isSartanGestureValid(gesture: GestureIntent): boolean {
  const sartanGestures: GestureType[] = ['rotate', 'long_press', 'double_tap'];
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
