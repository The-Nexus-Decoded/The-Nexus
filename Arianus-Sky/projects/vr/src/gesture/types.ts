/**
 * Gesture Resolver Types
 * VR-side implementation of GESTURE-RESOLVER-CONTRACT.md
 */

export interface SpatialIntent {
  action: 'tap' | 'hold' | 'swipe';
  position: { x: number; y: number; z: number };
  target: string;
  timestamp: number;
}

export type GestureType = 'double_tap' | 'long_press' | 'rotate' | 'tap' | 'hold' | 'swipe';

export interface GestureEvent {
  gesture: GestureType;
  position: THREE.Vector3;
  target: string;
  timestamp: number;
  duration?: number;
}

export type AmbientMode = 'full' | 'ambient' | 'silent';
export type GestureState = 'idle' | 'hover' | 'active' | 'disabled';

export interface GestureConfig {
  doubleTapThreshold: number;  // ms (300)
  longPressThreshold: number;  // ms (500)
  rateLimitMs: number;         // 2000ms
  coordinateSystem: 'world' | 'normalized';
}

export const DEFAULT_CONFIG: GestureConfig = {
  doubleTapThreshold: 300,
  longPressThreshold: 500,
  rateLimitMs: 2000,
  coordinateSystem: 'world',
};

export interface AnimationTimings {
  fade: number;      // 200ms
  pulse: number;     // 300ms
  scale: number;     // 150ms
  transition: number; // 400ms
}

export const ANIMATION_TIMINGS: AnimationTimings = {
  fade: 200,
  pulse: 300,
  scale: 150,
  transition: 400,
};
