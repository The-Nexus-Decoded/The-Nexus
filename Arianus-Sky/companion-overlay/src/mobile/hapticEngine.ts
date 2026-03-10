/**
 * Haptic Feedback Engine
 * Maps gestures to haptic patterns per Orla's Visual Language Spec
 * 
 * Visual/Haptic Topology:
 * - Intensity maps to gesture velocity
 * - TAP: Light tap
 * - DOUBLE-TAP: Double tap
 * - DRAG: Soft pulse
 * - PINCH: Continuous
 * - ROTATE/TWIST: Continuous
 * - LONG-PRESS: Heavy pulse
 * 
 * @author Paithan
 * @date 2026-03-09
 */

import { GestureType } from './types';

/**
 * Haptic feedback patterns
 */
export type HapticPattern = 'light' | 'medium' | 'heavy' | 'softPulse' | 'heavyPulse' | 'doubleTap' | 'continuous' | 'none';

/**
 * Haptic engine configuration
 */
export interface HapticConfig {
  enabled: boolean;
  intensity: 'light' | 'medium' | 'heavy';
  velocityMapping: boolean; // Map intensity to gesture velocity
}

/**
 * Haptic Feedback Engine
 * Handles vibration patterns for gesture feedback
 */
export class HapticEngine {
  private config: HapticConfig;
  private vibrationController: ((pattern: number | number[]) => boolean) | null = null;
  private continuousInterval: number | null = null;
  private lastVelocity: number = 0;

  constructor(config: Partial<HapticConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      intensity: config.intensity ?? 'medium',
      velocityMapping: config.velocityMapping ?? true
    };

    // Check for vibration API
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      this.vibrationController = navigator.vibrate.bind(navigator);
    }
  }

  /**
   * Trigger haptic feedback for a gesture
   * @param gestureType Type of gesture
   * @param state Gesture state
   * @param velocity Current velocity (pixels/ms) for intensity mapping
   */
  trigger(gestureType: GestureType, state: 'began' | 'recognized' | 'ended', velocity: number = 0): void {
    if (!this.config.enabled || !this.vibrationController) return;

    this.lastVelocity = velocity;
    const pattern = this.getPattern(gestureType, state);
    
    if (pattern !== 'none') {
      // Apply velocity-based intensity modulation if enabled
      const intensityMod = this.config.velocityMapping ? this.getVelocityMultiplier(velocity) : 1;
      this.playPattern(pattern, intensityMod);
    }
  }

  /**
   * Get haptic pattern for gesture type and state
   * Per Orla's spec:
   */
  private getPattern(gestureType: GestureType, state: 'began' | 'recognized' | 'ended'): HapticPattern {
    switch (gestureType) {
      case 'tap':
        return state === 'recognized' ? 'light' : 'none';
      
      case 'double_tap':
        return state === 'recognized' ? 'doubleTap' : 'none';
      
      case 'drag':
        if (state === 'began') return 'softPulse';
        if (state === 'ended') return 'light';
        return 'none';
      
      case 'pinch':
        if (state === 'recognized') return 'continuous';
        if (state === 'ended') return 'light';
        return 'none';
      
      case 'rotate':
      case 'twist':
        if (state === 'recognized') return 'continuous';
        if (state === 'ended') return 'light';
        return 'none';
      
      case 'long_press':
        if (state === 'recognized') return 'heavyPulse';
        if (state === 'ended') return 'light';
        return 'none';
      
      default:
        return 'none';
    }
  }

  /**
   * Calculate intensity multiplier from velocity
   * Higher velocity = stronger haptic feedback
   */
  private getVelocityMultiplier(velocity: number): number {
    // Velocity in pixels/ms, typical range 0-5
    // Map to 0.5-1.5 range
    const normalized = Math.min(Math.max(velocity / 3, 0), 2); // 0-2 range
    return 0.5 + (normalized * 0.5); // 0.5 to 1.5
  }

  /**
   * Play a haptic pattern with intensity modifier
   */
  private playPattern(pattern: HapticPattern, intensityMod: number = 1): void {
    if (!this.vibrationController) return;

    const baseIntensity = this.getIntensityMultiplier();
    const combinedIntensity = baseIntensity * intensityMod;

    switch (pattern) {
      case 'light':
        this.vibrationController(10 * combinedIntensity);
        break;
      
      case 'medium':
        this.vibrationController(20 * combinedIntensity);
        break;
      
      case 'heavy':
        this.vibrationController(40 * combinedIntensity);
        break;
      
      case 'softPulse':
        this.vibrationController([0, 10 * combinedIntensity, 50, 10 * combinedIntensity] as number[]);
        break;
      
      case 'heavyPulse':
        // Distinctive heavy pulse pattern for long press
        this.vibrationController([0, 30 * combinedIntensity, 80, 30 * combinedIntensity] as number[]);
        break;
      
      case 'doubleTap':
        // Two quick taps
        this.vibrationController([5, 30, 5, 30] as number[]);
        break;
      
      case 'continuous':
        this.startContinuous(combinedIntensity);
        break;
    }
  }

  /**
   * Start continuous haptic feedback with variable intensity
   */
  startContinuous(intensity: number = 1): void {
    if (this.continuousInterval) return;
    
    // Gentle continuous vibration modulated by intensity
    this.continuousInterval = window.setInterval(() => {
      this.vibrationController?.(15 * intensity);
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
   * Get base intensity multiplier from config
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

  /**
   * Enable/disable velocity mapping
   */
  setVelocityMapping(enabled: boolean): void {
    this.config.velocityMapping = enabled;
  }

  /**
   * Get current velocity for external use
   */
  getLastVelocity(): number {
    return this.lastVelocity;
  }
}

/**
 * Singleton instance
 */
export const hapticEngine = new HapticEngine();
