// AmbientSkin - Acknowledgment patterns with thermal escalation
// Implements AmbientSkin Contract: Tier 1/2/3 ack patterns
// Nominal (<35°C): Tier as-set
// Throttling (35-38°C): Auto-bump one tier higher
// Critical (>38°C): Max tier, force-reduce activity

import { Platform, Vibration } from 'react-native';
import { NativeModules } from 'react-native';
import { thermalMonitor, ThermalState } from './ThermalMonitor';
import { hapticBridge } from './HapticBridge';

export type AckTier = 1 | 2 | 3;

export interface AmbientSkinConfig {
  tier: AckTier;
  enableScreenFlash: boolean;   // For Tier 3
  enableHaptics: boolean;
  thermalEscalation: boolean;  // Auto-bump tier on thermal throttling
}

const DEFAULT_CONFIG: AmbientSkinConfig = {
  tier: 2,  // Default to Attentive
  enableScreenFlash: true,
  enableHaptics: true,
  thermalEscalation: true
};

// Ack pattern definitions per spec
const ACK_PATTERNS: Record<AckTier, { haptics: number | number[]; flash?: boolean }> = {
  1: { haptics: [] },                    // Passive: No ack
  2: { haptics: [0, 35] },              // Attentive: Single pulse
  3: { haptics: [0, 50, 80, 50], flash: true }  // Urgent: Double pulse + flash
};

// Thermal escalation tiers
const ESCALATION_MAP: Record<ThermalState, AckTier> = {
  nominal: 1,
  throttling: 2,
  critical: 3
};

type AckListener = (tier: AckTier, event: 'ack_sent' | 'tier_changed') => void;

export class AmbientSkin {
  private config: AmbientSkinConfig;
  private listeners: Set<AckListener> = new Set();
  private currentTier: AckTier;
  private thermalSubscription: (() => void) | null = null;
  private isFlashing = false;

  constructor(config: Partial<AmbientSkinConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentTier = this.config.tier;

    if (this.config.thermalEscalation) {
      this.setupThermalEscalation();
    }
  }

  private setupThermalEscalation(): void {
    // Subscribe to thermal state changes
    this.thermalSubscription = thermalMonitor.subscribe((state, temperature) => {
      const escalatedTier = ESCALATION_MAP[state];
      
      // Auto-bump: only increase tier, never decrease manually
      if (escalatedTier > this.currentTier) {
        this.setTier(escalatedTier, true);
      }

      // Critical: force-reduce activity
      if (state === 'critical') {
        this.forceReduceActivity();
      }
    });
  }

  // === Acknowledgment Patterns ===

  // Send acknowledgment to VR (phone confirms VR received)
  async sendAck(): Promise<void> {
    const pattern = ACK_PATTERNS[this.currentTier];

    if (this.config.enableHaptics && pattern.haptics.length > 0) {
      // Use haptic bridge for consistent feedback
      if (this.currentTier === 2) {
        await hapticBridge.trigger('INTENT_EMITTED');
      } else if (this.currentTier === 3) {
        // Double pulse for Tier 3
        await hapticBridge.trigger('INTENT_CONFIRMED');
        setTimeout(async () => {
          await hapticBridge.trigger('INTENT_EMITTED');
        }, 80);
      }
    }

    // Screen flash for Tier 3 (Urgent)
    if (this.currentTier === 3 && this.config.enableScreenFlash) {
      this.triggerScreenFlash();
    }

    this.notifyListeners('ack_sent');
  }

  // Send override acknowledgment (user engaged)
  async sendOverrideAck(): Promise<void> {
    // Override always uses Tier 3 pattern regardless of current tier
    if (this.config.enableHaptics) {
      await hapticBridge.trigger('INTENT_CONFIRMED');
      setTimeout(async () => {
        await hapticBridge.trigger('INTENT_CONFIRMED');
      }, 80);
    }

    if (this.config.enableScreenFlash) {
      this.triggerScreenFlash();
    }
  }

  private triggerScreenFlash(): void {
    if (this.isFlashing) return;
    this.isFlashing = true;

    // Would trigger native screen flash in production
    // For now, brief vibration pattern
    Vibration.vibrate([0, 50, 30, 50]);

    setTimeout(() => {
      this.isFlashing = false;
    }, 200);
  }

  // === Tier Management ===

  getTier(): AckTier {
    return this.currentTier;
  }

  setTier(tier: AckTier, silent = false): void {
    if (tier === this.currentTier) return;
    if (tier < 1 || tier > 3) return;

    this.currentTier = tier;
    this.config.tier = tier;

    if (!silent) {
      this.notifyListeners('tier_changed');
    }
  }

  // Force-reduce activity on critical thermal state
  private forceReduceActivity(): void {
    // In production: reduce update frequency, disable animations, etc.
    console.warn('[AmbientSkin] Critical thermal state - forcing activity reduction');
  }

  private notifyListeners(event: 'ack_sent' | 'tier_changed'): void {
    this.listeners.forEach(listener => listener(this.currentTier, event));
  }

  // === Public API ===

  onAck(listener: AckListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getConfig(): AmbientSkinConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<AmbientSkinConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Check if current tier requires acknowledgment
  requiresAck(): boolean {
    return this.currentTier > 1;
  }

  // Get haptic pattern for current tier
  getHapticPattern(): number | number[] {
    return ACK_PATTERNS[this.currentTier].haptics;
  }

  destroy(): void {
    if (this.thermalSubscription) {
      this.thermalSubscription();
    }
    this.listeners.clear();
  }
}

// Singleton
export const ambientSkin = new AmbientSkin();
