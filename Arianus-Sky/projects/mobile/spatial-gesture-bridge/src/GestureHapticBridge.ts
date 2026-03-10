// Gesture-Haptic Bridge
// Maps gestures to platform-specific haptic feedback

import { 
  GestureType, 
  GestureEvent, 
  HapticPattern, 
  GESTURE_HAPTIC_MAP,
  TIMING 
} from './types';

export type HapticPlatform = 'ios' | 'android' | 'web' | 'mock';

export interface HapticEmitter {
  playPattern(pattern: HapticPattern): Promise<void>;
}

// ==================== Platform Implementations ====================

// iOS UIKit Feedback Generator
export class iOSHapticEmitter implements HapticEmitter {
  private impactLight: any = null;
  private impactMedium: any = null;
  private impactHeavy: any = null;
  private notification: any = null;

  constructor() {
    // Dynamically loaded - see iOS native module
  }

  async playPattern(pattern: HapticPattern): Promise<void> {
    // iOS native module will implement:
    // UIImpactFeedbackGenerator / UINotificationFeedbackGenerator
    console.log('[iOS Haptics]', pattern);
  }
}

// Android VibrationEffect
export class AndroidHapticEmitter implements HapticEmitter {
  private vibrator: any = null;

  constructor() {
    // Dynamically loaded - see Android native module  
  }

  async playPattern(pattern: HapticPattern): Promise<void> {
    // Android native module will implement:
    // VibrationEffect.createWaveform()
    console.log('[Android Haptics]', pattern);
  }
}

// Web Vibration API fallback
export class WebHapticEmitter implements HapticEmitter {
  async playPattern(pattern: HapticPattern): Promise<void> {
    if (!navigator.vibrate) {
      console.warn('[Web Haptics] Vibration API not supported');
      return;
    }

    const timings: number[] = [];
    pattern.pulses.forEach((pulse, i) => {
      timings.push(pulse);
      if (i < pattern.gaps.length) {
        timings.push(pattern.gaps[i]);
      }
    });

    navigator.vibrate(timings);
  }
}

// Mock for testing
export class MockHapticEmitter implements HapticEmitter {
  private logs: HapticPattern[] = [];

  async playPattern(pattern: HapticPattern): Promise<void> {
    this.logs.push(pattern);
    console.log('[Mock Haptics]', pattern);
  }

  getLogs(): HapticPattern[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

// ==================== Gesture-Haptic Bridge ====================

export class GestureHapticBridge {
  private emitter: HapticEmitter;
  private platform: HapticPlatform;
  private lastTapTime: number = 0;
  private tapCount: number = 0;

  constructor(platform: HapticPlatform) {
    this.platform = platform;
    this.emitter = this.createEmitter(platform);
  }

  private createEmitter(platform: HapticPlatform): HapticEmitter {
    switch (platform) {
      case 'ios':
        return new iOSHapticEmitter();
      case 'android':
        return new AndroidHapticEmitter();
      case 'web':
        return new WebHapticEmitter();
      case 'mock':
      default:
        return new MockHapticEmitter();
    }
  }

  /**
   * Process a gesture event and trigger appropriate haptics
   */
  async processGesture(gesture: GestureType, confidence: number): Promise<GestureEvent> {
    const event: GestureEvent = {
      type: gesture,
      timestamp: Date.now(),
      confidence,
    };

    // Only trigger haptics if confidence meets threshold
    if (confidence >= 0.8) {
      const pattern = GESTURE_HAPTIC_MAP[gesture];
      await this.emitter.playPattern(pattern);
    }

    return event;
  }

  /**
   * Handle double-tap detection with timing tolerance
   */
  async handleTap(): Promise<GestureType> {
    const now = Date.now();
    const timeSinceLastTap = now - this.lastTapTime;

    this.lastTapTime = now;

    if (timeSinceLastTap <= TIMING.doubleTapInterval) {
      this.tapCount++;
      
      if (this.tapCount === 2) {
        this.tapCount = 0;
        return 'double_tap';
      }
    } else {
      this.tapCount = 1;
    }

    return 'double_tap'; // Single tap
  }

  /**
   * Handle long-press detection
   */
  async handleLongPress(durationMs: number): Promise<GestureType> {
    if (durationMs >= TIMING.longPressThreshold) {
      return 'long_press';
    }
    return 'double_tap'; // Fallback
  }

  /**
   * Get platform-specific haptic parameters
   */
  getPlatformHapticParams(gesture: GestureType): object {
    const pattern = GESTURE_HAPTIC_MAP[gesture];

    switch (this.platform) {
      case 'ios':
        return this.getiOSParams(pattern);
      case 'android':
        return this.getAndroidParams(pattern);
      default:
        return pattern;
    }
  }

  private getiOSParams(pattern: HapticPattern): object {
    const impactMap = {
      low: 'light',
      medium: 'medium',
      high: 'heavy',
    };

    return {
      feedbackStyle: impactMap[pattern.intensity],
      pulses: pattern.pulses.length,
    };
  }

  private getAndroidParams(pattern: HapticPattern): object {
    const amplitudeMap = {
      low: 50,
      medium: 150,
      high: 255,
    };

    return {
      timings: pattern.pulses.flatMap((p, i) => [p, pattern.gaps[i] || 0]),
      amplitudes: pattern.pulses.map(() => amplitudeMap[pattern.intensity]),
    };
  }

  /**
   * Check if platform supports haptics
   */
  isSupported(): boolean {
    if (this.platform === 'web') {
      return typeof navigator !== 'undefined' && !!navigator.vibrate;
    }
    return true; // Native platforms always supported
  }
}

// ==================== Factory ====================

export function createGestureHapticBridge(platform?: HapticPlatform): GestureHapticBridge {
  const detectedPlatform = platform || detectPlatform();
  return new GestureHapticBridge(detectedPlatform);
}

function detectPlatform(): HapticPlatform {
  if (typeof window === 'undefined') return 'mock';
  
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ios/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'web';
}
