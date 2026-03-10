/**
 * IntentQueue - 3-deep FIFO queue with sustained session cap
 * Per XRPC-SPEC.md Section 5
 */
import { SpatialIntent } from './types';

export interface QueuedIntent {
  id: string;
  intent: SpatialIntent;
  timestamp: number;
  status: 'queued' | 'sending' | 'confirmed' | 'rejected';
  retryCount: number;
}

export const MAX_QUEUE_DEPTH = 3;
export const MAX_SUSTAINED_SESSIONS = 5;
export const MAX_RETRIES = 2;

export class IntentQueue {
  private queue: QueuedIntent[] = [];
  private activeSessions: Map<string, number> = new Map(); // sessionId -> count

  /**
   * Add intent to queue
   * @returns true if added, false if queue full (drops oldest)
   */
  enqueue(id: string, intent: SpatialIntent): boolean {
    // If queue full, drop oldest confirmed/queued item
    if (this.queue.length >= MAX_QUEUE_DEPTH) {
      const dropIndex = this.queue.findIndex(
        i => i.status === 'confirmed' || i.status === 'rejected'
      );
      if (dropIndex >= 0) {
        this.queue.splice(dropIndex, 1);
      } else {
        // All pending, can't add more
        return false;
      }
    }

    this.queue.push({
      id,
      intent,
      timestamp: Date.now(),
      status: 'queued',
      retryCount: 0,
    });

    return true;
  }

  /**
   * Get next intent to send
   */
  dequeue(): QueuedIntent | null {
    const next = this.queue.find(i => i.status === 'queued');
    if (next) {
      next.status = 'sending';
    }
    return next || null;
  }

  /**
   * Mark intent as confirmed
   */
  confirm(id: string): void {
    const item = this.queue.find(i => i.id === id);
    if (item) {
      item.status = 'confirmed';
    }
  }

  /**
   * Mark intent as rejected
   */
  reject(id: string): void {
    const item = this.queue.find(i => i.id === id);
    if (item) {
      item.status = 'rejected';
    }
  }

  /**
   * Retry a failed intent
   */
  retry(id: string): boolean {
    const item = this.queue.find(i => i.id === id);
    if (!item || item.status !== 'rejected') return false;
    if (item.retryCount >= MAX_RETRIES) {
      return false;
    }

    item.status = 'queued';
    item.retryCount++;
    return true;
  }

  /**
   * Get current queue depth
   */
  getDepth(): number {
    return this.queue.filter(i => i.status === 'queued' || i.status === 'sending').length;
  }

  /**
   * Check if queue can accept more
   */
  isFull(): boolean {
    return this.getDepth() >= MAX_QUEUE_DEPTH;
  }

  /**
   * Get all pending intents
   */
  getPending(): QueuedIntent[] {
    return this.queue.filter(i => i.status === 'queued' || i.status === 'sending');
  }

  /**
   * Register active session
   */
  registerSession(sessionId: string): boolean {
    const current = this.activeSessions.get(sessionId) || 0;
    if (current >= MAX_SUSTAINED_SESSIONS) {
      return false;
    }
    this.activeSessions.set(sessionId, current + 1);
    return true;
  }

  /**
   * Unregister session
   */
  unregisterSession(sessionId: string): void {
    const current = this.activeSessions.get(sessionId) || 0;
    if (current > 0) {
      this.activeSessions.set(sessionId, current - 1);
    }
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    let total = 0;
    for (const count of this.activeSessions.values()) {
      total += count;
    }
    return total;
  }

  /**
   * Clear completed intents
   */
  cleanup(): void {
    this.queue = this.queue.filter(
      i => i.status === 'queued' || i.status === 'sending'
    );
  }
}

export default IntentQueue;
