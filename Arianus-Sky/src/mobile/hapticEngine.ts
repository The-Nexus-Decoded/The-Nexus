/**
 * Haptic Feedback Engine
 * Maps gestures to haptic patterns per Orla's Visual Language Spec
 * 
 * @author Paithan
 * @date 2026-03-09
 */

import { GestureType } from './types';

/**
 * Haptic feedback patterns
 */
export type HapticPattern = 'light' | 'medium' | 'heavy' | 'softPulse' | 'continuous' | 'none';

/**
 * Haptic engine configuration
 */
export interface HapticConfig {
  enabled: boolean;
  intensity: 'light' | 'medium' | 'heavy';
}

/**
 * Haptic Feedback Engine
 * Handles vibration patterns for gesture feedback
 */
export class HapticEngine {
  private config: HapticConfig;
  private vibrationController: VibrationAPI | null = null;
  private continuousInterval: number | null = null;

  constructor(config: Partial<HapticConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      intensity: config.intensity ?? 'medium'
    };

    // Check for vibration API
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      this.vibrationController = navigator.vibrate.bind(navigator);
    }
  }

  /**
   * Trigger haptic feedback for a gesture
   */
  trigger(gestureType: GestureType, state: 'began' | 'recognized' | 'ended'): void {
    if (!this.config.enabled || !this.vibrationController) return;

    const pattern = this.getPattern(gestureType, state);
    if (pattern !== 'none') {
      this.playPattern(pattern);
    }
  }

  /**
   * Get haptic pattern for gesture type and state
   * Per Orla's spec:
   * - TAP: Light tap
   * - DRAG: Soft pulse
   * - PINCH: Continuous
   * - TWIST: Continuous
   * - LONG_PRESS: Heavy
   */
  private getPattern(gestureType: GestureType, state: 'began' | 'recognized' | 'ended'): HapticPattern {
    switch (gestureType) {
      case 'tap':
        return state === 'recognized' ? 'light' : 'none';
      
      case 'drag':
        if (state === 'began') return 'softPulse';
        if (state === 'ended') return 'light';
        return 'none';
      
      case 'pinch':
        if (state === 'recognized') return 'continuous';
        if (state === 'ended') return 'light';
        return 'none';
      
      case 'twist':
        if (state === 'recognized') return 'continuous';
        if (state === 'ended') return 'light';
        return 'none';
      
      case 'long_press':
        if (state === 'recognized') return 'heavy';
        return 'none';
      
      default:
        return 'none';
    }
  }

  /**
   * Play a haptic pattern
   */
  private playPattern(pattern: HapticPattern): void {
    if (!this.vibrationController) return;

    const intensityMultiplier = this.getIntensityMultiplier();

    switch (pattern) {
      case 'light':
        this.vibrationController(10 * intensityMultiplier);
        break;
      
      case 'medium':
        this.vibrationController(20 * intensityMultiplier);
        break;
      
      case 'heavy':
        this.vibrationController(40 * intensityMultiplier);
        break;
      
      case 'softPulse':
        this.vibrationController([0, 10, 50, 10] as number[]);
        break;
      
      case 'continuous':
        // Start continuous vibration, must be stopped manually
        this.startContinuous();
        break;
    }
  }

  /**
   * Start continuous haptic feedback
   */
  startContinuous(): void {
    if (this.continuousInterval) return;
    
    const intensityMultiplier = this.getIntensityMultiplier();
    
    // Gentle continuous vibration
    this.continuousInterval = window.setInterval(() => {
      this.vibrationController?.(15 * intensityMultiplier);
    }, 100);
  }

  /**
   * Stop continuous haptic feedback
   */
  stopContinuous(): void {
    if (this.continuousInterval) {
      clearInterval(this.continuousInterval);
      this.continuousInterval = null;
    }
  }

  /**
   * Get intensity multiplier based on config
   */
  private getIntensityMultiplier(): number {
    switch (this.config.intensity) {
      case 'light': return 0.5;
      case 'medium': return 1.0;
      case 'heavy': return 1.5;
      default: return 1.0;
    }
  }

  /**
   * Enable/disable haptics
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.stopContinuous();
    }
  }

  /**
   * Set intensity level
   */
  setIntensity(intensity: 'light' | 'medium' | 'heavy'): void {
    this.config.intensity = intensity;
  }
}

/**
 * Singleton instance
 */
export const hapticEngine = new HapticEngine();
