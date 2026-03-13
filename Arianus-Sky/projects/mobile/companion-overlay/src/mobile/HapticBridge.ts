// HapticBridge - Haptic confirmation for gesture emission
// Provides tactile feedback when gestures cross the mobile↔spatial bridge

import { Platform, Vibration } from 'react-native';
import { NativeModules } from 'react-native';

export enum HapticBridgeEvent {
  INTENT_EMITTED = 'INTENT_EMITTED',
  INTENT_CONFIRMED = 'INTENT_CONFIRMED',
  INTENT_RETURNED = 'INTENT_RETURNED',
  BRIDGE_CONNECTED = 'BRIDGE_CONNECTED',
  BRIDGE_DISCONNECTED = 'BRIDGE_DISCONNECTED',
  LATENCY_WARNING = 'LATENCY_WARNING',
  ROTATION_TICK = 'ROTATION_TICK'  // 15° discrete rotation tick
}

export interface HapticPattern {
  pattern: number | number[];
  repeat: number;
}

export interface HapticConfig {
  intentEmitted: HapticStyle;
  intentConfirmed: HapticStyle;
  intentReturned: HapticStyle;
  bridgeConnected: HapticStyle;
  bridgeDisconnected: HapticStyle;
  latencyWarning: HapticStyle;
  rotationTick: HapticStyle;  // 15° discrete rotation
}

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const DEFAULT_HAPTIC_CONFIG: HapticConfig = {
  intentEmitted: 'medium',
  intentConfirmed: 'success',
  intentReturned: 'light',
  bridgeConnected: 'success',
  bridgeDisconnected: 'warning',
  latencyWarning: 'error',
  rotationTick: 'selection'  // Subtle tick for rotation
};

// Platform-specific haptic triggers
const NATIVE_HAPTICS: Record<string, (style: string) => void> = {};

// iOS: Use native haptics via module
async function triggerIOS(style: HapticStyle): Promise<void> {
  const { HapticFeedback } = NativeModules;
  if (HapticFeedback) {
    HapticFeedback.trigger(style);
  } else {
    // Fallback to basic vibration
    Vibration.vibrate(10);
  }
}

// Android: Use vibration patterns
function triggerAndroid(style: HapticStyle): void {
  const patterns: Record<HapticStyle, HapticPattern> = {
    light: { pattern: 10, repeat: -1 },
    medium: { pattern: 20, repeat: -1 },
    heavy: { pattern: 40, repeat: -1 },
    success: { pattern: [0, 20, 50, 20], repeat: -1 },
    warning: { pattern: [0, 30, 50, 30], repeat: -1 },
    error: { pattern: [0, 50, 100, 50], repeat: -1 },
    selection: { pattern: 5, repeat: -1 }
  };
  
  const p = patterns[style] || patterns.light;
  Vibration.vibrate(p.pattern);
}

export class HapticBridge {
  private config: HapticConfig;
  private enabled: boolean = true;

  constructor(config: Partial<HapticConfig> = {}) {
    this.config = { ...DEFAULT_HAPTIC_CONFIG, ...config };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async trigger(event: HapticBridgeEvent): Promise<void> {
    if (!this.enabled) return;

    const style = this.getStyleForEvent(event);
    await this.play(style);
  }

  private getStyleForEvent(event: HapticBridgeEvent): HapticStyle {
    switch (event) {
      case HapticBridgeEvent.INTENT_EMITTED:
        return this.config.intentEmitted;
      case HapticBridgeEvent.INTENT_CONFIRMED:
        return this.config.intentConfirmed;
      case HapticBridgeEvent.INTENT_RETURNED:
        return this.config.intentReturned;
      case HapticBridgeEvent.BRIDGE_CONNECTED:
        return this.config.bridgeConnected;
      case HapticBridgeEvent.BRIDGE_DISCONNECTED:
        return this.config.bridgeDisconnected;
      case HapticBridgeEvent.LATENCY_WARNING:
        return this.config.latencyWarning;
      case HapticBridgeEvent.ROTATION_TICK:
        return this.config.rotationTick;
      default:
        return 'light';
    }
  }

  private async play(style: HapticStyle): Promise<void> {
    if (Platform.OS === 'ios') {
      await triggerIOS(style);
    } else if (Platform.OS === 'android') {
      triggerAndroid(style);
    }
  }

  // Convenience methods
  async onIntentEmit(): Promise<void> {
    await this.trigger(HapticBridgeEvent.INTENT_EMITTED);
  }

  async onIntentConfirm(): Promise<void> {
    await this.trigger(HapticBridgeEvent.INTENT_CONFIRMED);
  }

  async onIntentReturn(): Promise<void> {
    await this.trigger(HapticBridgeEvent.INTENT_RETURNED);
  }

  async onBridgeConnect(): Promise<void> {
    await this.trigger(HapticBridgeEvent.BRIDGE_CONNECTED);
  }

  async onBridgeDisconnect(): Promise<void> {
    await this.trigger(HapticBridgeEvent.BRIDGE_DISCONNECTED);
  }

  async onLatencyWarning(): Promise<void> {
    await this.trigger(HapticBridgeEvent.LATENCY_WARNING);
  }

  // 15° discrete rotation tick
  async onRotationTick(): Promise<void> {
    await this.trigger(HapticBridgeEvent.ROTATION_TICK);
  }
}

// Singleton instance
export const hapticBridge = new HapticBridge();
