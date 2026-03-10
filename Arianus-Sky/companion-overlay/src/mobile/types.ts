/**
 * Spatial Gesture Bridge - Type Definitions
 */

export type IntentAction = 'SELECT' | 'TRANSLATE' | 'SCALE' | 'ROTATE' | 'GRAB' | 'RELEASE';

export type GestureType = 'tap' | 'double_tap' | 'drag' | 'pinch' | 'rotate' | 'twist' | 'long_press' | 'unknown';
export type GestureState = 'began' | 'recognized' | 'changed' | 'ended' | 'cancelled';

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface Vector3 {
  0: number;
  1: number;
  2: number;
}

export interface Gesture {
  id: number;
  startPoint: ScreenPoint;
  currentPoint: ScreenPoint;
  startTime: number;
  lastMoveTime: number;
  velocity: number; // pixels per ms
  type: GestureType;
  state: GestureState;
  targetId?: string;
}

export interface SpatialIntent {
  action: IntentAction;
  targetId?: string;
  vector: {
    position?: Vector3;
    delta?: Vector3;
    factor?: number;
    axis?: Vector3;
    angle?: number;
    center?: Vector3;
  };
  timestamp: number;
  confidence: number; // 0.0-1.0
}
