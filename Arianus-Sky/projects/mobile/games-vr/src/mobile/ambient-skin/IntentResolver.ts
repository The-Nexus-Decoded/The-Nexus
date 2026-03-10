/**
 * IntentResolver - Bidirectional VR ↔ Mobile confirm flow
 * Per XRPC-SPEC.md Section 5
 */
import { GestureThrottle } from './GestureThrottle';
import { XRpcError, XRpcErrorCode, SpatialIntent, LATENCY_BUDGET_MS, RESOLVE_TIMEOUT_MS, ROUNDTRIP_TIMEOUT_MS, ACTIONABLE_THRESHOLD_MS } from './types';

export type IntentStatus = 'pending' | 'confirmed' | 'rejected' | 'timeout';

export interface IntentResolution {
  id: string;
  intent: SpatialIntent;
  status: IntentStatus;
  createdAt: number;
  confirmedAt?: number;
  error?: XRpcError;
  retryCount: number;
}

export const MAX_RETRIES = 2;

export class IntentResolver {
  private pendingIntents: Map<string, IntentResolution> = new Map();
  private throttle: GestureThrottle;
  private confirmCallback?: (id: string, confirmed: boolean) => void;
  private timeoutCallback?: (id: string) => void;

  constructor() {
    this.throttle = new GestureThrottle();
  }

  /**
   * Submit an intent for resolution
   * @returns intent ID if submitted, null if throttled
   */
  submitIntent(intent: SpatialIntent): string | null {
    if (!this.throttle.canEmit()) {
      return null;
    }

    const id = this.generateIntentId();
    const resolution: IntentResolution = {
      id,
      intent,
      status: 'pending',
      createdAt: Date.now(),
      retryCount: 0,
    };

    this.pendingIntents.set(id, resolution);
    this.startResolutionTimer(id);

    return id;
  }

  /**
   * Confirm an intent (called when VR acknowledges)
   */
  confirm(id: string): void {
    const resolution = this.pendingIntents.get(id);
    if (!resolution) return;

    resolution.status = 'confirmed';
    resolution.confirmedAt = Date.now();
    
    this.confirmCallback?.(id, true);
  }

  /**
   * Reject an intent with error
   */
  reject(id: string, error: XRpcError): void {
    const resolution = this.pendingIntents.get(id);
    if (!resolution) return;

    resolution.status = 'rejected';
    resolution.error = error;
    
    this.confirmCallback?.(id, false);
  }

  /**
   * Get pending intent by ID
   */
  getIntent(id: string): IntentResolution | undefined {
    return this.pendingIntents.get(id);
  }

  /**
   * Get all pending intents
   */
  getPendingIntents(): IntentResolution[] {
    return Array.from(this.pendingIntents.values()).filter(
      r => r.status === 'pending'
    );
  }

  /**
   * Check if any pending intent has exceeded actionable threshold
   */
  hasActionableTimeout(): IntentResolution | null {
    const now = Date.now();
    for (const resolution of this.pendingIntents.values()) {
      if (resolution.status === 'pending') {
        const elapsed = now - resolution.createdAt;
        if (elapsed > ACTIONABLE_THRESHOLD_MS) {
          return resolution;
        }
      }
    }
    return null;
  }

  /**
   * Retry a timed-out intent (once)
   */
  retry(id: string): void {
    const resolution = this.pendingIntents.get(id);
    if (!resolution || resolution.status !== 'timeout') return;
    if (resolution.retryCount >= MAX_RETRIES) {
      this.pendingIntents.delete(id);
      return;
    }

    resolution.status = 'pending';
    resolution.retryCount++;
    resolution.createdAt = Date.now();
    this.startResolutionTimer(id);
  }

  /**
   * Set callback for confirm/reject events
   */
  onConfirm(callback: (id: string, confirmed: boolean) => void): void {
    this.confirmCallback = callback;
  }

  /**
   * Set callback for timeout events
   */
  onTimeout(callback: (id: string) => void): void {
    this.timeoutCallback = callback;
  }

  /**
   * Clear completed intents
   */
  cleanup(): void {
    for (const [id, resolution] of this.pendingIntents.entries()) {
      if (resolution.status !== 'pending') {
        this.pendingIntents.delete(id);
      }
    }
  }

  private startResolutionTimer(id: string): void {
    setTimeout(() => {
      const resolution = this.pendingIntents.get(id);
      if (resolution && resolution.status === 'pending') {
        resolution.status = 'timeout';
        this.timeoutCallback?.(id);
      }
    }, ROUNDTRIP_TIMEOUT_MS);
  }

  private generateIntentId(): string {
    return `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default IntentResolver;
