/**
 * GestureThrottle - Rate limiter for gesture intents
 * 100ms interval to prevent intent spam
 * 
 * @author Haplo
 * @date 2026-03-10
 */

import { GestureType } from '../types';

// Local GestureEvent definition (mirrors ../types)
export interface GestureEvent {
  type: GestureType;
  timestamp: number;
  confidence: number; // 0.0-1.0
}

export interface ThrottleConfig {
  intervalMs: number;      // 100ms default
  enabled: boolean;
}

export const DEFAULT_THROTTLE_CONFIG: ThrottleConfig = {
  intervalMs: 100,
  enabled: true,
};

export type ConfidenceAction = 'execute' | 'confirm' | 'ignore';

export interface ThrottledGesture extends GestureEvent {
  action: ConfidenceAction;
}

export const CONFIDENCE_THRESHOLDS = {
  execute: 0.85,   // ≥0.85 → execute immediately
  confirm: 0.60,   // 0.60-0.84 → require confirmation
  ignore: 0.60,    // <0.60 → ignore
} as const;

export class GestureThrottle {
  private config: ThrottleConfig;
  private lastGestureTime: Map<GestureType, number> = new Map();
  private pendingConfirmations: Map<string, ThrottledGesture> = new Map();

  constructor(config: Partial<ThrottleConfig> = {}) {
    this.config = { ...DEFAULT_THROTTLE_CONFIG, ...config };
  }

  /**
   * Process gesture through throttle + confidence threshold
   */
  process(gesture: GestureEvent): ThrottledGesture | null {
    if (!this.config.enabled) {
      return this.applyConfidenceAction(gesture);
    }

    const now = Date.now();
    const lastTime = this.lastGestureTime.get(gesture.type) || 0;

    // Check throttle interval
    if (now - lastTime < this.config.intervalMs) {
      return null; // Throttled
    }

    this.lastGestureTime.set(gesture.type, now);
    return this.applyConfidenceAction(gesture);
  }

  /**
   * Apply confidence threshold logic
   */
  private applyConfidenceAction(gesture: GestureEvent): ThrottledGesture {
    let action: ConfidenceAction;

    if (gesture.confidence >= CONFIDENCE_THRESHOLDS.execute) {
      action = 'execute';
    } else if (gesture.confidence >= CONFIDENCE_THRESHOLDS.confirm) {
      action = 'confirm';
    } else {
      action = 'ignore';
    }

    return {
      ...gesture,
      action,
    };
  }

  /**
   * Store pending confirmation for user acknowledgment
   */
  storePending(id: string, gesture: ThrottledGesture): void {
    if (gesture.action === 'confirm') {
      this.pendingConfirmations.set(id, gesture);
    }
  }

  /**
   * Confirm pending gesture
   */
  confirm(id: string): ThrottledGesture | null {
    const pending = this.pendingConfirmations.get(id);
    this.pendingConfirmations.delete(id);
    return pending || null;
  }

  /**
   * Clear pending confirmation
   */
  clearPending(id: string): void {
    this.pendingConfirmations.delete(id);
  }

  /**
   * Check if gesture type is currently throttled
   */
  isThrottled(gestureType: GestureType): boolean {
    if (!this.config.enabled) return false;
    const lastTime = this.lastGestureTime.get(gestureType) || 0;
    return Date.now() - lastTime < this.config.intervalMs;
  }

  /**
   * Get time until gesture type is available
   */
  getCooldownMs(gestureType: GestureType): number {
    const lastTime = this.lastGestureTime.get(gestureType) || 0;
    const elapsed = Date.now() - lastTime;
    return Math.max(0, this.config.intervalMs - elapsed);
  }

  /**
   * Update config
   */
  setConfig(config: Partial<ThrottleConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset all throttle state
   */
  reset(): void {
    this.lastGestureTime.clear();
    this.pendingConfirmations.clear();
  }
}

// Singleton
export const gestureThrottle = new GestureThrottle();
