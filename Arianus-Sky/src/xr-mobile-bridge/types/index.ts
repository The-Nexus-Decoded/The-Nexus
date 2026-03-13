// Client → Server
export interface GesturePayload {
  type: 'gesture' | 'thermal' | 'proximity';
  timestamp: number;
  data: GestureData | ThermalData | ProximityData;
}

export interface GestureData {
  gesture: GestureType;
  confidence: number;
  position?: { x: number; y: number; z?: number };
  velocity?: number;
  duration?: number;
}

export type GestureType =
  | 'flick' | 'hold' | 'circle' | 'pinch'
  | 'double-tap' | 'long-press'
  | 'tap' | 'swipe_left' | 'swipe_right';

export interface ThermalData {
  chipTemp: number;
  timestamp: number;
}

export interface ProximityData {
  distance: number;
  timestamp: number;
}

// Server → Client
export interface RenderPayload {
  type: 'preview' | 'haptic' | 'state' | 'thermal_adapt';
  timestamp: number;
  data: PreviewData | HapticData | StateData | ThermalAdaptData;
}

export interface PreviewData {
  intent: string;
  visual: VisualPreview;
  duration: number;
}

export type VisualPreview =
  | 'ghost_wireframe' | 'glow_pulse' | 'rotation_ring'
  | 'highlight_outline' | 'menu_skin_flash' | 'arrow_wipe_left'
  | 'arrow_wipe_right' | 'glow_cyan' | 'glow_red';

export interface HapticData {
  pattern: HapticPattern;
  intensity: 'low' | 'medium' | 'high';
  duration?: number;
  gaps?: number[];
}

export type HapticPattern = 'single' | 'double' | 'triple' | 'continuous';

export interface StateData {
  mode: 'sartan' | 'patryn' | 'ambient';
  previewQueue: number;
}

export interface ThermalAdaptData {
  tier: ThermalTier;
  actions: string[];
}

export type ThermalTier = 0 | 1 | 2 | 3 | 4;

// Connection states
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'authenticated'
  | 'operational';

// Proximity zones
export type ProximityZone = 'far' | 'mid' | 'near' | 'intimate';

export interface ProximityConfig {
  farThreshold: number;    // >40cm
  midThreshold: number;    // 15-40cm
  nearThreshold: number;   // 5-15cm
  intimateThreshold: number; // <5cm
}

export const DEFAULT_PROXIMITY_CONFIG: ProximityConfig = {
  farThreshold: 40,
  midThreshold: 15,
  nearThreshold: 5,
  intimateThreshold: 0,
};

// Confidence thresholds
export const CONFIDENCE_EXECUTE = 0.85;
export const CONFIDENCE_QUEUE = 0.60;
export const CONFIDENCE_IGNORE = 0.60;

// Thermal tiers
export const THERMAL_TIER_0 = 40;
export const THERMAL_TIER_1 = 55;
export const THERMAL_TIER_2 = 70;
export const THERMAL_TIER_3 = 85;

// Gesture → Haptic mapping (Sartan)
export interface GestureHapticMapping {
  gesture: GestureType;
  intent: string;
  visual: VisualPreview;
  pattern: HapticPattern;
  intensity: 'low' | 'medium' | 'high';
  duration?: number;
  gaps?: number[];
}

export const SARTAN_GESTURE_MAP: Record<GestureType, GestureHapticMapping> = {
  flick: {
    gesture: 'flick',
    intent: 'cast',
    visual: 'ghost_wireframe',
    pattern: 'single',
    intensity: 'medium',
    duration: 35,
  },
  hold: {
    gesture: 'hold',
    intent: 'charge',
    visual: 'glow_pulse',
    pattern: 'continuous',
    intensity: 'low',
  },
  circle: {
    gesture: 'circle',
    intent: 'rotate',
    visual: 'rotation_ring',
    pattern: 'double',
    intensity: 'high',
    duration: 50,
    gaps: [80],
  },
  pinch: {
    gesture: 'pinch',
    intent: 'grab',
    visual: 'highlight_outline',
    pattern: 'single',
    intensity: 'high',
    duration: 40,
  },
  'double-tap': {
    gesture: 'double-tap',
    intent: 'confirm',
    visual: 'glow_cyan',
    pattern: 'single',
    intensity: 'medium',
    duration: 35,
  },
  'long-press': {
    gesture: 'long-press',
    intent: 'error',
    visual: 'glow_red',
    pattern: 'triple',
    intensity: 'high',
    duration: 40,
    gaps: [50, 50],
  },
  // Patryn gestures (not used in Sartan mode but defined for completeness)
  tap: {} as GestureHapticMapping,
  swipe_left: {} as GestureHapticMapping,
  swipe_right: {} as GestureHapticMapping,
};

export const PATRYN_GESTURE_MAP: Record<GestureType, GestureHapticMapping> = {
  tap: {
    gesture: 'tap',
    intent: 'menu_select',
    visual: 'menu_skin_flash',
    pattern: 'single',
    intensity: 'low',
    duration: 25,
  },
  swipe_left: {
    gesture: 'swipe_left',
    intent: 'navigate_back',
    visual: 'arrow_wipe_left',
    pattern: 'single',
    intensity: 'medium',
    duration: 30,
  },
  swipe_right: {
    gesture: 'swipe_right',
    intent: 'navigate_forward',
    visual: 'arrow_wipe_right',
    pattern: 'single',
    intensity: 'medium',
    duration: 30,
  },
  hold: {
    gesture: 'hold',
    intent: 'back',
    visual: 'glow_red',
    pattern: 'double',
    intensity: 'medium',
    duration: 40,
    gaps: [60],
  },
  'double-tap': {
    gesture: 'double-tap',
    intent: 'confirm',
    visual: 'glow_cyan',
    pattern: 'single',
    intensity: 'medium',
    duration: 35,
  },
  'long-press': {
    gesture: 'long-press',
    intent: 'error',
    visual: 'glow_red',
    pattern: 'triple',
    intensity: 'high',
    duration: 40,
    gaps: [50, 50],
  },
  // Sartan gestures
  flick: {} as GestureHapticMapping,
  circle: {} as GestureHapticMapping,
  pinch: {} as GestureHapticMapping,
};
