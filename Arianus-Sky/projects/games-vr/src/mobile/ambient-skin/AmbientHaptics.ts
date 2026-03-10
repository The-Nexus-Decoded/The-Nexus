/**
 * AmbientHaptics - Bi-directional haptic vocabulary
 * Tap patterns user learns to recognize without looking
 * 
 * Per spec:
 * - Single pulse: Minor event (damage_taken, cooldown_ready, ambient_update)
 * - Double pulse: Significant event (quest_complete, enemy_spotted, trade_offer)
 * - Sustained: Critical (combat, decision_point, thermal_warning, user_required)
 * 
 * @author Paithan
 * @date 2026-03-09
 */

import { HapticPattern, HapticEvent } from './types';

// Event type → pattern mapping
const HAPTIC_VOCABULARY: Record<string, HapticEvent> = {
  // Single pulse: Minor events - no ack required
  damage_taken: {
    pattern: 'single_pulse',
    meaning: 'Minor damage received',
    eventType: 'combat',
    ackRequired: false
  },
  cooldown_ready: {
    pattern: 'single_pulse',
    meaning: 'Ability cooldown complete',
    eventType: 'combat',
    ackRequired: false
  },
  ambient_update: {
    pattern: 'single_pulse',
    meaning: 'Background state update',
    eventType: 'ambient',
    ackRequired: false
  },
  
  // Double pulse: Significant events - ack required
  quest_complete: {
    pattern: 'double_pulse',
    meaning: 'Quest objective completed',
    eventType: 'mission',
    ackRequired: true
  },
  enemy_spotted: {
    pattern: 'double_pulse',
    meaning: 'Enemy detected nearby',
    eventType: 'combat',
    ackRequired: true
  },
  trade_offer: {
    pattern: 'double_pulse',
    meaning: 'Incoming trade offer',
    eventType: 'trade',
    ackRequired: true
  },
  message_received: {
    pattern: 'double_pulse',
    meaning: 'New message',
    eventType: 'social',
    ackRequired: true
  },
  
  // Sustained: Critical events - ack required
  combat: {
    pattern: 'sustained',
    meaning: 'Combat engagement',
    eventType: 'combat',
    ackRequired: true
  },
  decision_point: {
    pattern: 'sustained',
    meaning: 'Player decision required',
    eventType: 'mission',
    ackRequired: true
  },
  thermal_warning: {
    pattern: 'sustained',
    meaning: 'Device overheating',
    eventType: 'thermal',
    ackRequired: true
  },
  user_required: {
    pattern: 'sustained',
    meaning: 'User attention required',
    eventType: 'system',
    ackRequired: true
  }
};

// Platform-specific haptic implementations
type HapticTrigger = (pattern: HapticPattern, duration?: number) => Promise<void>;

export class AmbientHaptics {
  private enabled: boolean = true;
  private hapticTrigger: HapticTrigger | null = null;
  private ackCallbacks: Map<string, () => void> = new Map();
  
  // Bi-directional loop tracking
  private pendingAcks: Map<string, { event: string; timestamp: number }> = new Map();
  private readonly ACK_TIMEOUT_MS = 5000;

  constructor() {
    // Auto-cleanup old pending acks
    setInterval(() => this.cleanupStaleAcks(), 10000);
  }

  /**
   * Set platform haptic trigger
   */
  setHapticTrigger(trigger: HapticTrigger): void {
    this.hapticTrigger = trigger;
  }

  /**
   * Enable/disable haptics
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Trigger haptic for event type
   * Returns ack ID if acknowledgment required
   */
  async trigger(eventType: string): Promise<string | null> {
    if (!this.enabled) return null;

    const vocab = HAPTIC_VOCABULARY[eventType];
    if (!vocab) {
      console.warn(`[AmbientHaptics] Unknown event type: ${eventType}`);
      return null;
    }

    await this.playPattern(vocab.pattern);

    // Track ack requirement
    if (vocab.ackRequired) {
      const ackId = `ack_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      this.pendingAcks.set(ackId, { event: eventType, timestamp: Date.now() });
      
      // Auto-timeout ack
      setTimeout(() => {
        if (this.pendingAcks.has(ackId)) {
          console.warn(`[AmbientHaptics] Ack timeout for: ${eventType}`);
          this.pendingAcks.delete(ackId);
        }
      }, this.ACK_TIMEOUT_MS);

      return ackId;
    }

    return null;
  }

  /**
   * Confirm haptic received (bi-directional loop)
   * Called when VR confirms receipt of mobile intent
   */
  async confirmReceived(ackId: string): Promise<void> {
    const pending = this.pendingAcks.get(ackId);
    if (!pending) return;

    // Play confirmation haptic
    await this.playPattern('single_pulse');
    this.pendingAcks.delete(ackId);
  }

  /**
   * Acknowledge critical event
   */
  async ack(ackId: string): Promise<void> {
    const pending = this.pendingAcks.get(ackId);
    if (!pending) return;

    // User acknowledged - send confirmation back to VR
    await this.playPattern('double_pulse');
    this.pendingAcks.delete(ackId);
  }

  /**
   * Play haptic pattern
   */
  private async playPattern(pattern: HapticPattern, customDuration?: number): Promise<void> {
    if (!this.hapticTrigger) {
      // Fallback to Web Vibration API
      await this.webVibrate(pattern, customDuration);
      return;
    }

    await this.hapticTrigger(pattern, customDuration);
  }

  /**
   * Web Vibration API fallback
   */
  private async webVibrate(pattern: HapticPattern, customDuration?: number): Promise<void> {
    if (!('vibrate' in navigator)) return;

    const patterns: Record<HapticPattern, number | number[]> = {
      single_pulse: 50,
      double_pulse: [0, 50, 100, 50],
      sustained: customDuration ?? 500
    };

    navigator.vibrate(patterns[pattern]);
  }

  /**
   * Get vocabulary entry for event
   */
  getVocabulary(eventType: string): HapticEvent | undefined {
    return HAPTIC_VOCABULARY[eventType];
  }

  /**
   * Get all vocabulary entries
   */
  getAllVocabulary(): Record<string, HapticEvent> {
    return { ...HAPTIC_VOCABULARY };
  }

  /**
   * Check if event requires ack
   */
  requiresAck(eventType: string): boolean {
    const vocab = HAPTIC_VOCABULARY[eventType];
    return vocab?.ackRequired ?? false;
  }

  /**
   * Get pending ack count
   */
  getPendingAckCount(): number {
    return this.pendingAcks.size;
  }

  /**
   * Cleanup stale pending acks
   */
  private cleanupStaleAcks(): void {
    const now = Date.now();
    for (const [id, pending] of this.pendingAcks.entries()) {
      if (now - pending.timestamp > this.ACK_TIMEOUT_MS) {
        this.pendingAcks.delete(id);
      }
    }
  }

  // === Convenience Methods ===

  /**
   * VR → Phone: Event sent confirmation
   */
  async onEventSent(eventType: string): Promise<string | null> {
    return this.trigger(eventType);
  }

  /**
   * Phone → VR: Received confirmation
   * Called when mobile receives spatial event
   */
  async onEventReceived(): Promise<void> {
    await this.playPattern('single_pulse');
  }

  /**
   * Thermal warning
   */
  async thermalWarning(): Promise<string | null> {
    return this.trigger('thermal_warning');
  }

  /**
   * Combat alert
   */
  async combatAlert(): Promise<string | null> {
    return this.trigger('combat');
  }

  /**
   * Trade offer
   */
  async tradeOffer(): Promise<string | null> {
    return this.trigger('trade_offer');
  }

  /**
   * Message received
   */
  async messageReceived(): Promise<string | null> {
    return this.trigger('message_received');
  }
}

// Singleton
export const ambientHaptics = new AmbientHaptics();
