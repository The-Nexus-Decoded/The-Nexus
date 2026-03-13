// IntentResolver - XR → Mobile confirmation handler
// Handles bidirectional flow: intent resolution confirmations from spatial receiver

import { GestureType } from './companion-feedback-states';
import { hapticBridge } from './HapticBridge';
import { ambientSkin } from './AmbientSkin';

export type IntentStatus = 
  | 'pending'      // Sent, waiting for VR
  | 'confirmed'    // VR acknowledged intent
  | 'committed'    // Action completed in VR
  | 'rejected'    // VR rejected intent
  | 'timeout';    // No response from VR

export interface IntentConfirmation {
  intentId: string;
  status: IntentStatus;
  transform?: {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number; w: number };
    scale?: number;
  };
  timestamp: number;
  errorCode?: string;
  errorMessage?: string;
}

// Pending intents awaiting confirmation
const pendingIntents = new Map<string, {
  intent: any;
  sentAt: number;
  timeoutMs: number;
  resolve: (confirmation: IntentConfirmation) => void;
  reject: (error: Error) => void;
}>();

// Default timeout: 2s per spec (Gesture → Headset confirm)
const DEFAULT_TIMEOUT_MS = 2000;

export class IntentResolver {
  private static instance: IntentResolver;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start cleanup timer for stale intents
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleIntents();
    }, 5000) as unknown as NodeJS.Timeout;
  }

  static getInstance(): IntentResolver {
    if (!IntentResolver.instance) {
      IntentResolver.instance = new IntentResolver();
    }
    return IntentResolver.instance;
  }

  // === Outbound: Send intent to VR, wait for confirmation ===

  async sendAndWait(
    intent: any,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): Promise<IntentConfirmation> {
    const intentId = intent.id || `intent_${Date.now()}`;
    const sentAt = Date.now();

    return new Promise((resolve, reject) => {
      // Store pending intent
      pendingIntents.set(intentId, {
        intent,
        sentAt,
        timeoutMs,
        resolve,
        reject
      });

      // TODO: Send to WebSocket endpoint (Haplo's /ws/vr-game)
      // For now, log the intent
      console.log(`[IntentResolver] Sent intent: ${intentId}`, intent);
    });
  }

  // === Inbound: Handle confirmation from VR ===

  handleConfirmation(confirmation: IntentConfirmation): void {
    const pending = pendingIntents.get(confirmation.intentId);
    if (!pending) {
      console.warn(`[IntentResolver] No pending intent found: ${confirmation.intentId}`);
      return;
    }

    // Clear pending
    pendingIntents.delete(confirmation.intentId);

    // Trigger appropriate feedback based on status
    this.triggerFeedback(confirmation.status);

    // Resolve the promise
    pending.resolve(confirmation);
  }

  private triggerFeedback(status: IntentStatus): void {
    switch (status) {
      case 'confirmed':
        // VR acknowledged - single pulse (Tier 2)
        hapticBridge.trigger('INTENT_EMITTED');
        ambientSkin.sendAck();
        break;

      case 'committed':
        // Action completed - double pulse (Tier 3)
        hapticBridge.trigger('INTENT_CONFIRMED');
        ambientSkin.sendOverrideAck();
        break;

      case 'rejected':
      case 'timeout':
        // Error state - triple pulse + red visual
        hapticBridge.trigger('ERROR');
        break;
    }
  }

  // === Timeout handling ===

  private cleanupStaleIntents(): void {
    const now = Date.now();
    
    for (const [intentId, pending] of pendingIntents.entries()) {
      const elapsed = now - pending.sentAt;
      
      if (elapsed > pending.timeoutMs) {
        // Timeout - reject with timeout status
        pendingIntents.delete(intentId);
        
        const confirmation: IntentConfirmation = {
          intentId,
          status: 'timeout',
          timestamp: now
        };
        
        pending.resolve(confirmation);
        this.triggerFeedback('timeout');
      }
    }
  }

  // === Public API ===

  getPendingCount(): number {
    return pendingIntents.size;
  }

  cancelPending(intentId: string): boolean {
    const pending = pendingIntents.get(intentId);
    if (pending) {
      pendingIntents.delete(intentId);
      pending.reject(new Error('Intent cancelled by user'));
      return true;
    }
    return false;
  }

  cancelAll(): void {
    for (const [intentId, pending] of pendingIntents.entries()) {
      pending.reject(new Error('All intents cancelled'));
    }
    pendingIntents.clear();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cancelAll();
  }
}

// Singleton
export const intentResolver = IntentResolver.getInstance();
