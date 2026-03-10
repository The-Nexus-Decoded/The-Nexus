/**
 * StateReconciliation - Delta merge protocol
 * VR is source of truth, mobile queue is temporary state
 * 
 * @author Paithan
 * @date 2026-03-09
 */

import { 
  ReconciliationState, 
  PendingIntent, 
  ReconciliationResult,
  IntentType 
} from './types';

const MAX_PENDING_INTENTS = 50;

export class StateReconciliation {
  private state: ReconciliationState;
  private listeners: Set<(state: ReconciliationState) => void> = new Set();

  constructor() {
    this.state = {
      lastStateHash: '',
      lastAckedIntentId: null,
      pendingIntents: [],
      strategy: 'delta_merge'
    };
  }

  /**
   * Get current state
   */
  getState(): ReconciliationState {
    return { 
      ...this.state, 
      pendingIntents: [...this.state.pendingIntents] 
    };
  }

  /**
   * Get pending intents count
   */
  getPendingCount(): number {
    return this.state.pendingIntents.length;
  }

  /**
   * Check if queue overflowed
   */
  isOverflowed(): boolean {
    return this.state.pendingIntents.length >= MAX_PENDING_INTENTS;
  }

  /**
   * Add pending intent
   */
  addPending(
    id: string, 
    type: IntentType, 
    payload: unknown
  ): void {
    // Handle overflow: drop oldest
    if (this.state.pendingIntents.length >= MAX_PENDING_INTENTS) {
      this.state.pendingIntents.shift();
      console.warn('[StateReconciliation] Queue overflow - dropped oldest intent');
    }

    const pending: PendingIntent = {
      id,
      type,
      payload,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.state.pendingIntents.push(pending);
    this.notifyListeners();
  }

  /**
   * Update pending intent status
   */
  updateStatus(
    id: string, 
    status: PendingIntent['status'],
    newPayload?: unknown
  ): void {
    const intent = this.state.pendingIntents.find(p => p.id === id);
    if (!intent) return;

    intent.status = status;
    if (newPayload) {
      intent.payload = newPayload;
    }

    this.notifyListeners();
  }

  /**
   * Remove intent from queue
   */
  remove(id: string): boolean {
    const index = this.state.pendingIntents.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.state.pendingIntents.splice(index, 1);
    this.notifyListeners();
    return true;
  }

  /**
   * Clear all pending intents
   */
  clear(): void {
    this.state.pendingIntents = [];
    this.notifyListeners();
  }

  /**
   * Initiate reconciliation with VR
   * Called on explicit reconnect, heartbeat timeout, or user-triggered resync
   */
  async reconcile(
    vrLastStateHash: string,
    vrLastAckedIntentId: string | null
  ): Promise<ReconciliationResult> {
    const accepted: string[] = [];
    const rejected: { id: string; reason: string }[] = [];
    const transformed: { id: string; newPayload: unknown }[] = [];

    // Find intents not yet acknowledged by VR
    const unacked = this.findUnackedIntents(vrLastAckedIntentId);

    for (const pending of unacked) {
      // Check if still valid (not expired)
      const isExpired = Date.now() - pending.timestamp > 30000; // 30s expiry
      if (isExpired) {
        rejected.push({ id: pending.id, reason: 'expired' });
        this.updateStatus(pending.id, 'rejected');
        continue;
      }

      // Mark as pending reconciliation
      this.updateStatus(pending.id, 'pending');

      // In real implementation, VR would validate each against current world state
      // For now, accept all - VR would respond with accept/reject/transform
      accepted.push(pending.id);
      this.updateStatus(pending.id, 'accepted');
    }

    // Update state hash
    this.state.lastStateHash = vrLastStateHash;
    this.state.lastAckedIntentId = vrLastAckedIntentId;

    this.notifyListeners();

    return { accepted, rejected, transformed };
  }

  /**
   * Find intents not yet acknowledged
   */
  private findUnackedIntents(vrLastAckedId: string | null): PendingIntent[] {
    if (!vrLastAckedId) {
      // No previous ack - all pending are unacked
      return this.state.pendingIntents.filter(p => p.status === 'pending');
    }

    // Find index of last acked
    const lastAckedIndex = this.state.pendingIntents.findIndex(
      p => p.id === vrLastAckedId
    );

    if (lastAckedIndex === -1) {
      // Last acked not found - treat all as unacked
      return this.state.pendingIntents.filter(p => p.status === 'pending');
    }

    // Return everything after last acked
    return this.state.pendingIntents.slice(lastAckedIndex + 1)
      .filter(p => p.status === 'pending');
  }

  /**
   * Handle VR rejection
   */
  handleRejection(intentId: string, reason: string): void {
    const intent = this.state.pendingIntents.find(p => p.id === intentId);
    if (!intent) return;

    console.warn(`[StateReconciliation] Intent rejected: ${intentId} - ${reason}`);
    this.updateStatus(intentId, 'rejected');
  }

  /**
   * Handle VR transformation
   */
  handleTransformation(intentId: string, newPayload: unknown): void {
    const intent = this.state.pendingIntents.find(p => p.id === intentId);
    if (!intent) return;

    console.log(`[StateReconciliation] Intent transformed: ${intentId}`);
    this.updateStatus(intentId, 'transformed', newPayload);
  }

  /**
   * Handle VR acceptance
   */
  handleAcceptance(intentId: string): void {
    this.state.lastAckedIntentId = intentId;
    this.remove(intentId);
  }

  /**
   * Set last state hash
   */
  setStateHash(hash: string): void {
    this.state.lastStateHash = hash;
  }

  /**
   * Get last state hash
   */
  getStateHash(): string {
    return this.state.lastStateHash;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: ReconciliationState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // === Sync Triggers ===

  /**
   * Explicit reconnect
   */
  async onReconnect(): Promise<ReconciliationResult> {
    // Would request VR state hash and last acked intent
    // For now, return empty result
    return { accepted: [], rejected: [], transformed: [] };
  }

  /**
   * Heartbeat timeout (30s)
   */
  async onHeartbeatTimeout(): Promise<ReconciliationResult> {
    return this.onReconnect();
  }

  /**
   * Intent rejection from VR
   */
  onIntentRejection(intentId: string, reason: string): void {
    this.handleRejection(intentId, reason);
  }

  /**
   * User-triggered resync (phone pickup during disconnect)
   */
  async onUserResync(): Promise<ReconciliationResult> {
    return this.onReconnect();
  }
}

// Singleton
export const stateReconciliation = new StateReconciliation();
