// Feedback topology: visual, haptics, spatial audio
// Gestures: tap, drag, pinch, rotate, double-tap, long-press

// Sartan gesture threshold: ≥80% = valid, below = ambiguous
export const SARTAN_CONFIDENCE_THRESHOLD = 0.80;

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
      confirmed: { type: 'scale_pulse', scale: 1.05, durationMs: 200, easing: 'elastic' },
      error: null
    },
    colors: { primary: '#00FFFF', accent: '#00FFFF', outline: '#00FFFF' },
    duration: 200
  },
  [CompanionFeedbackState.ERROR]: {
    state: CompanionFeedbackState.ERROR,
    animation: {
      intentSent: null,
      confirmed: null,
      error: { type: 'shake', durationMs: 300, easing: 'ease-in-out' }
    },
    colors: { primary: '#FF4444', accent: '#FF6666', outline: '#FF0000' },
    duration: 300
  }
};

// Contrast ratios for accessibility (WCAG)
export const ACCESSIBILITY_CONTRAST = {
  largeText: 4.5,  // 4.5:1 for normal text
  normalText: 7.0  // 7:1 for enhanced
};

// Gesture → Visual effect mapping
export const GESTURE_VISUAL_MAP: Record<GestureType, string> = {
  [GestureType.TAP]: 'glow',
  [GestureType.DOUBLE_TAP]: 'glow',
  [GestureType.LONG_PRESS]: 'glow_pulse',
  [GestureType.DRAG]: 'ghost_wireframe',
  [GestureType.PINCH]: 'corner_handles',
  [GestureType.ROTATE]: 'rotation_ring',
  [GestureType.PINCH_SARTAN]: 'depth_handle',
  [GestureType.FLICK]: 'ghost_wireframe',
  [GestureType.HOLD]: 'glow_pulse',
  [GestureType.CIRCLE]: 'rotation_ring',
};

// Timing constants (locked spec)
export const TIMING = {
  GESTURE_TO_HEADSET_CONFIRM_MS: 2000,
  DOUBLE_TAP_INTERVAL_MAX_MS: 300,
  LONG_PRESS_THRESHOLD_MS: 500,
  MIN_TOUCH_TARGET_PT: 44,
} as const;
