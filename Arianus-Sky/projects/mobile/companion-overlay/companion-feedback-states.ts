// Feedback topology: visual, haptics, spatial audio
// Gestures: tap, drag, pinch, rotate, double-tap, long-press

// Sartan gesture threshold: ≥80% = valid, below = ambiguous
export const SARTAN_CONFIDENCE_THRESHOLD = 0.80;

// Timing constraints (from Orla's locked spec)
export const GESTURE_CONFIRM_TIMEOUT_MS = 2000;
export const DOUBLE_TAP_INTERVAL_MS = 300;
export const LONG_PRESS_THRESHOLD_MS = 500;
export const ERROR_SHAKE_DURATION_MS = 300;

// Visual output mapping (Sartan gesture → visual effect)
export type VisualEffectType = 
  | 'ghost_wireframe'   // flick → cast
  | 'glow_pulse'       // hold → charge  
  | 'rotation_ring'    // circle → rotate
  | 'highlight_outline'; // pinch → grab

export const GESTURE_VISUAL_MAP: Record<GestureType, VisualEffectType> = {
  [GestureType.FLICK]: 'ghost_wireframe',
  [GestureType.HOLD]: 'glow_pulse',
  [GestureType.CIRCLE]: 'rotation_ring',
  [GestureType.PINCH_SARTAN]: 'highlight_outline',
  // Mobile native gestures
  [GestureType.TAP]: 'highlight_outline',
  [GestureType.DRAG]: 'ghost_wireframe',
  [GestureType.PINCH]: 'highlight_outline',
  [GestureType.ROTATE]: 'rotation_ring',
  [GestureType.DOUBLE_TAP]: 'highlight_outline',
  [GestureType.LONG_PRESS]: 'highlight_outline'
};

// Circular rotation: discrete events at 15° intervals
export const ROTATION_DISCRETE_DEGREES = 15;

// Gaze confirm distance threshold (meters)
export const GAZE_CONFIRM_DISTANCE_METERS = 1.5;

// Source: menu = Patryn presentation skin
export type PresentationSkin = 'default' | 'menu';

export enum CompanionFeedbackState {
  IDLE = 'IDLE',
  INTENT_SENT = 'INTENT_SENT',
  CONFIRMED = 'CONFIRMED',
  ERROR = 'ERROR'
}

export enum GestureType {
  // Mobile native
  TAP = 'tap',
  DRAG = 'drag',
  PINCH = 'pinch',
  ROTATE = 'rotate',
  DOUBLE_TAP = 'double_tap',
  LONG_PRESS = 'long_press',
  // Sartan gestures (XR native)
  FLICK = 'flick',
  HOLD = 'hold',
  CIRCLE = 'circle',
  PINCH_SARTAN = 'pinch_sartan'
}

export enum FeedbackModality {
  VISUAL = 'visual',
  HAPTIC = 'haptic',
  SPATIAL_AUDIO = 'spatial_audio'
}

export interface HapticSpec {
  type: 'impact' | 'notification' | 'selection';
  style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
  delayMs: number;
}

export interface SpatialAudioSpec {
  sound: string;
  position: { x: number; y: number; z: number };
  volume: number;
  spatial: boolean;
}

export interface FeedbackConfig {
  state: CompanionFeedbackState;
  animation: FeedbackAnimation;
  colors: FeedbackColors;
  duration: number;
}

export interface FeedbackAnimation {
  intentSent: AnimationSpec;
  confirmed: AnimationSpec;
  error: AnimationSpec;
}

export interface AnimationSpec {
  type: 'glow' | 'scale_pulse' | 'shake' | 'flash';
  scale?: number;
  durationMs: number;
  easing: 'ease-out' | 'ease-in-out' | 'elastic';
}

export interface FeedbackColors {
  primary: string;
  accent: string;
  outline: string;
}

// Visual feedback specs matching VR surface
export const FEEDBACK_CONFIGS: Record<CompanionFeedbackState, FeedbackConfig> = {
  [CompanionFeedbackState.IDLE]: {
    state: CompanionFeedbackState.IDLE,
    animation: { intentSent: null, confirmed: null, error: null },
    colors: { primary: 'transparent', accent: 'transparent', outline: 'transparent' },
    duration: 0
  },
  [CompanionFeedbackState.INTENT_SENT]: {
    state: CompanionFeedbackState.INTENT_SENT,
    animation: {
      intentSent: { type: 'glow', durationMs: 300, easing: 'ease-out' },
      confirmed: null,
      error: null
    },
    colors: { primary: '#4A90D9', accent: '#6BB3FF', outline: '#4A90D9' },
    duration: 300
  },
  [CompanionFeedbackState.CONFIRMED]: {
    state: CompanionFeedbackState.CONFIRMED,
    animation: {
      intentSent: null,
      // rotate gesture: scale pulse 1.0→1.05→1.0 (200ms)
      // double-tap: glow cyan
      confirmed: { type: 'scale_pulse', scale: 1.05, durationMs: 200, easing: 'ease-out' },
      error: null
    },
    // Cyan for double-tap confirm
    colors: { primary: '#00FFFF', accent: '#00FFFF', outline: '#00FFFF' },
    duration: 200
  },
  [CompanionFeedbackState.ERROR]: {
    state: CompanionFeedbackState.ERROR,
    animation: {
      intentSent: null,
      confirmed: null,
      // long-press (500ms): red outline + 300ms shake
      error: { type: 'shake', durationMs: 300, easing: 'ease-in-out' }
    },
    // Red for error
    colors: { primary: '#FF4444', accent: '#FF6666', outline: '#FF0000' },
    duration: 300
  }
};

// Contrast ratios for accessibility (WCAG)
export const ACCESSIBILITY_CONTRAST = {
  largeText: 4.5,  // 4.5:1 for normal text
  normalText: 7.0  // 7:1 for enhanced
};

// iOS HIG minimum touch target (44pt)
export const MIN_TOUCH_TARGET_PT = 44;
