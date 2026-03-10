// XR Interface Types v1.0
// Derived from XR-Interface-Spec.md

export type PresentationMode = 'full' | 'ambient' | 'silent';

export type GestureType = 'double_tap' | 'rotate' | 'long_press' | 'mode_toggle';

export type IntentAction = 'move' | 'rotate' | 'scale';

export type PreviewType = 'ghost_wireframe' | 'rotation_ring' | 'corner_handles';

export type TrustTier = 1 | 2 | 3;

export type ErrorCode = 
  | 'object_not_found' 
  | 'out_of_bounds' 
  | 'confidence_too_low' 
  | 'timeout' 
  | 'invalid_transition';

// ==================== Gesture-Haptic Protocol ====================

export interface GestureEvent {
  type: GestureType;
  timestamp: number;
  confidence: number; // 0.0-1.0
}

export interface HapticPattern {
  pulses: number[];
  gaps: number[];
  intensity: 'low' | 'medium' | 'high';
}

export const GESTURE_HAPTIC_MAP: Record<GestureType, HapticPattern> = {
  double_tap: {
    pulses: [35],
    gaps: [],
    intensity: 'medium',
  },
  rotate: {
    pulses: [50, 50],
    gaps: [80],
    intensity: 'high',
  },
  long_press: {
    pulses: [40, 40, 40],
    gaps: [50, 50],
    intensity: 'high',
  },
  mode_toggle: {
    pulses: [50],
    gaps: [],
    intensity: 'medium',
  },
};

// ==================== Spatial UI Contract ====================

export interface ManipulationIntent {
  intentId: string;
  intent: 'manipulate';
  action: IntentAction;
  axis: 'x' | 'y';
  method: 'dual_trigger' | 'dual_grip';
  preview: {
    type: PreviewType;
    uniform: boolean;
  };
  confidence: number;
  user_can_override: boolean;
}

export interface ManipulationPreview {
  type: PreviewType;
  position?: { x: number; y: number };
  rotation?: number;
  scale?: number;
}

export const MANIPULATION_MATRIX: Record<IntentAction, ManipulationIntent['preview']> = {
  move: {
    type: 'ghost_wireframe',
    uniform: false,
  },
  rotate: {
    type: 'rotation_ring',
    uniform: true,
  },
  scale: {
    type: 'corner_handles',
    uniform: true,
  },
};

// ==================== Mobile ↔ XR Protocol ====================

export interface XRStateMessage {
  type: 'state';
  state: PresentationMode;
  timestamp: number;
  ttl_ms?: number;
}

export interface XRIntentMessage {
  type: 'intent';
  intent: ManipulationIntent;
  source: 'menu';
}

export interface XRResponseMessage {
  type: 'response';
  intentId: string;
  status: 'confirmed' | 'rejected';
  error?: {
    code: ErrorCode;
    message: string;
  };
}

export interface XRGestureMessage {
  type: 'gesture';
  gesture: GestureEvent;
  haptics_applied: boolean;
}

export type XRMessage = XRStateMessage | XRIntentMessage | XRResponseMessage | XRGestureMessage;

// ==================== AmbientSkin Contract ====================

export interface AckPattern {
  tier: TrustTier;
  pulses: number;
  screen_flash: boolean;
}

export const ACK_PATTERNS: Record<TrustTier, AckPattern> = {
  1: { tier: 1, pulses: 0, screen_flash: false },
  2: { tier: 2, pulses: 1, screen_flash: false },
  3: { tier: 3, pulses: 2, screen_flash: true },
};

export interface ThermalState {
  temperature: number;
  tier: TrustTier;
  throttled: boolean;
}

// ==================== Virtual Display Plane ====================

export interface VirtualDisplayConfig {
  distance: number;      // 1m from camera
  width: number;         // 0.8m
  aspectRatio: number;
}

export const VIRTUAL_DISPLAY_V1: VirtualDisplayConfig = {
  distance: 1.0,
  width: 0.8,
  aspectRatio: 16 / 9,
};

// ==================== World Unit Math ====================

export const WORLD_UNIT_BASELINE = {
  referenceDistance: 1.0,      // 1m
  fovHorizontal: 90,           // degrees
  canvasWidth: 1920,
  pixelsPerWorldUnit: 960,
  touchTargetPixels: 44,
  touchTargetWorldUnits: 44 / 960, // ~0.046m at 1m
};

// ==================== Error Response ====================

export interface XRErrorResponse {
  intentId: string;
  status: 'rejected';
  error: {
    code: ErrorCode;
    message: string;
  };
}

// ==================== Intent Queue ====================

export interface IntentQueueConfig {
  maxDepth: number;
  previewQueueMax: number;
  overflowThreshold: number;
  overflowBehavior: 'drop_oldest' | 'reject_new';
}

export const INTENT_QUEUE_CONFIG: IntentQueueConfig = {
  maxDepth: 3,
  previewQueueMax: 3,
  overflowThreshold: 50,
  overflowBehavior: 'drop_oldest',
};

// ==================== State Reconciliation ====================

export type ReconciliationMode = 'merge' | 'queue_flush' | 'last_wins';

export interface ReconciliationConfig {
  mode: ReconciliationMode;
  mergeStrategy?: 'combine_queues' | 'prioritize_higher_tier';
  maxQueueSize: number;
}

export const RECONCILIATION_CONFIG: Record<ReconciliationMode, ReconciliationConfig> = {
  merge: {
    mode: 'merge',
    mergeStrategy: 'combine_queues',
    maxQueueSize: 10,
  },
  queue_flush: {
    mode: 'queue_flush',
    maxQueueSize: 0,
  },
  last_wins: {
    mode: 'last_wins',
    maxQueueSize: 3,
  },
};

// ==================== Timing Constants ====================

export const TIMING = {
  gestureToHeadsetConfirm: 2000,      // ms
  doubleTapInterval: 300,              // ms
  longPressThreshold: 500,             // ms
  maxRoundTripLatency: 100,           // ms
  undoWindow: 3000,                    // ms
  frameDropRecovery: 2000,             // ms
};

// ==================== Spatial Hint ====================

export type SpatialHint = '3d_spawn' | '2d_overlay' | 'haptic_only';

export interface SpatialHintConfig {
  hint: SpatialHint;
  renderMobile: boolean;
  triggerHaptics: boolean;
}

export const SPATIAL_HINT_MAP: Record<SpatialHint, SpatialHintConfig> = {
  '3d_spawn': {
    hint: '3d_spawn',
    renderMobile: true,
    triggerHaptics: true,
  },
  '2d_overlay': {
    hint: '2d_overlay',
    renderMobile: true,
    triggerHaptics: true,
  },
  'haptic_only': {
    hint: 'haptic_only',
    renderMobile: false,
    triggerHaptics: true,
  },
};

// ==================== Charge Events (Cast) ====================

export type ChargeState = 'start' | 'stop';

export interface ChargeEvent {
  state: ChargeState;
  timestamp: number;
  intensity?: number; // 0.0-1.0 for gradual charging
}

// ==================== Gaze Confirmation ====================

export interface GazeConfirmation {
  required: boolean;
  distance: number;      // meters
  confirmed: boolean;
  gazeDuration: number;   // ms
}

export const GAZE_THRESHOLD_DISTANCE = 1.5; // meters

// ==================== HUD Angle Adjustment ====================

export interface HUDAngleOffset {
  offsetDegrees: number;
  calibrated: boolean;
  calibrationTimestamp?: number;
}

// ==================== Frame Drop Recovery ====================

export interface FrameDropState {
  isReverting: boolean;
  lastValidFrame: number;
  revertProgress: number; // 0.0-1.0
}

// ==================== Proximity Wake ====================

export interface ProximityConfig {
  enabled: boolean;
  useMotionFallback: boolean;
  wakeThresholdMs: number;
}

export const PROXIMITY_CONFIG: ProximityConfig = {
  enabled: true,
  useMotionFallback: true,
  wakeThresholdMs: 5000,
};

// ==================== Circular Rotation ====================

export interface RotationEvent {
  deltaDegrees: number;   // Cumulative degrees since gesture start
  threshold: number;      // 15 degrees per event
  eventNumber: number;    // Which 15° threshold was crossed
  timestamp: number;
}
