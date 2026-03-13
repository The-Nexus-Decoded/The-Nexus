import {
  HapticPattern,
  HapticData,
} from '../types';

export interface HapticOptions {
  fallbackToVibration?: boolean;
}

const INTENSITY_VALUES = {
  low: 0.3,
  medium: 0.6,
  high: 1.0,
};

export class HapticEngine {
  private vibrator: VibrationNavigator | null = null;
  private fallbackEnabled: boolean;
  private isSupported: boolean;

  constructor(options: HapticOptions = {}) {
    this.fallbackEnabled = options.fallbackToVibration ?? true;
    this.isSupported = this.checkSupport();
    
    if ('vibrate' in navigator) {
      this.vibrator = navigator;
    }
  }

  private checkSupport(): boolean {
    // Check for Web Vibration API
    if ('vibrate' in navigator) {
      return true;
    }
    
    // Check for iOS haptic engine (via touch)
    // This is approximate - real implementation would use native bridge
    return this.fallbackEnabled;
  }

  play(pattern: HapticPattern, intensity: 'low' | 'medium' | 'high', duration?: number, gaps?: number[]): void {
    if (!this.isSupported) {
      console.warn('Haptic feedback not supported');
      return;
    }

    const normalizedIntensity = INTENSITY_VALUES[intensity];

    switch (pattern) {
      case 'single':
        this.playSingle(normalizedIntensity, duration ?? 35);
        break;
      case 'double':
        this.playDouble(normalizedIntensity, duration ?? 50, gaps?.[0] ?? 80);
        break;
      case 'triple':
        this.playTriple(
          normalizedIntensity,
          duration ?? 40,
          gaps?.[0] ?? 50,
          gaps?.[1] ?? 50
        );
        break;
      case 'continuous':
        this.playContinuous(normalizedIntensity, duration ?? 500);
        break;
    }
  }

  playFromServer(data: HapticData): void {
    this.play(data.pattern, data.intensity, data.duration, data.gaps);
  }

  private playSingle(intensity: number, duration: number): void {
    // Use Web Vibration API
    if (this.vibrator) {
      this.vibrator.vibrate(duration);
      return;
    }

    // Fallback: trigger visual feedback (screen flash)
    this.triggerVisualFeedback(intensity, duration);
  }

  private playDouble(intensity: number, duration: number, gap: number): void {
    if (this.vibrator) {
      this.vibrator.vibrate([duration, gap, duration]);
      return;
    }

    // Fallback
    this.triggerVisualFeedback(intensity, duration);
    setTimeout(() => {
      this.triggerVisualFeedback(intensity, duration);
    }, duration + gap);
  }

  private playTriple(intensity: number, duration: number, gap1: number, gap2: number): void {
    if (this.vibrator) {
      this.vibrator.vibrate([duration, gap1, duration, gap2, duration]);
      return;
    }

    // Fallback
    this.triggerVisualFeedback(intensity, duration);
    setTimeout(() => {
      this.triggerVisualFeedback(intensity, duration);
    }, duration + gap1);
    setTimeout(() => {
      this.triggerVisualFeedback(intensity, duration);
    }, duration + gap1 + gap2 + duration);
  }

  private playContinuous(intensity: number, duration: number): void {
    if (this.vibrator) {
      // Continuous vibration
      this.vibrator.vibrate(duration);
      return;
    }

    // Fallback: repeated pulses
    const pulseDuration = 50;
    const pauseDuration = 30;
    const pulses = Math.floor(duration / (pulseDuration + pauseDuration));
    
    for (let i = 0; i < pulses; i++) {
      setTimeout(() => {
        this.triggerVisualFeedback(intensity, pulseDuration);
      }, i * (pulseDuration + pauseDuration));
    }
  }

  private triggerVisualFeedback(intensity: number, duration: number): void {
    // Create a visual pulse as haptic fallback
    // This would typically trigger a CSS animation or canvas effect
    if (typeof document !== 'undefined') {
      const event = new CustomEvent('xr-haptic', {
        detail: { intensity, duration },
      });
      document.dispatchEvent(event);
    }
  }

  // Wake/sleep haptics (from spec Section 2.4)
  playWakeHaptic(): void {
    this.play('single', 'low', 25);
  }

  playSleepHaptic(): void {
    this.play('double', 'low', 20, [60]);
  }

  // State change haptic (from spec Section 5.2)
  playStateChangeHaptic(): void {
    this.play('single', 'low', 15);
  }

  isAvailable(): boolean {
    return this.isSupported;
  }
}
