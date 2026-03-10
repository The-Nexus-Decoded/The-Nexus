// IntentQueue - 3-deep FIFO intent queue
// Implements: preview_queue_max: 3, FIFO drop on overflow
// Mobile edge: Queue overflow at 100 intents for sustained sessions

import { GestureIntent } from './GestureIntent';

export interface QueuedIntent {
  intent: GestureIntent;
  queuedAt: number;
  previewId: string;
  status: 'pending' | 'sent' | 'confirmed' | 'committed' | 'rejected';
}

const MAX_QUEUE_DEPTH = 3;
const MAX_SUSTAINED_INTENTS = 100;

export class IntentQueue {
  private queue: QueuedIntent[] = [];
  private sentIntents: Map<string, QueuedIntent> = new Map();
  private sustainedCount = 0;
  private listeners: Set<(event: QueueEvent) => void> = new Set();

  // === Core Queue Operations ===

  /**
   * Add intent to queue (or drop if full)
   * Returns: queued intent or null if dropped
   */
  enqueue(intent: GestureIntent, previewId: string): QueuedIntent | null {
    // Check sustained session limit
    if (this.sustainedCount >= MAX_SUSTAINED_INTENTS) {
      this.emit({ type: 'overflow_sustained', dropped: intent.id });
      return null;
    }

    // Check queue depth
    if (this.queue.length >= MAX_QUEUE_DEPTH) {
      // FIFO: drop oldest pending
      const dropped = this.queue.shift();
      this.emit({ type: 'overflow_queue', droppedId: dropped?.intent.id });
      
      const queued: QueuedIntent = {
        intent,
        queuedAt: Date.now(),
        previewId,
        status: 'pending'
      };
      this.queue.push(queued);
      this.sustainedCount++;
      
      this.emit({ type: 'enqueued', intent: queued });
      return queued;
    }

    const queued: QueuedIntent = {
      intent,
      queuedAt: Date.now(),
      previewId,
      status: 'pending'
    };

    this.queue.push(queued);
    this.sustainedCount++;
    this.emit({ type: 'enqueued', intent: queued });
    
    return queued;
  }

  /**
   * Get next pending intent (FIFO)
   */
  peek(): QueuedIntent | null {
    return this.queue[0] || null;
  }

  /**
   * Mark intent as sent (moves from queue to sent tracking)
   */
  markSent(intentId: string): QueuedIntent | null {
    const index = this.queue.findIndex(q => q.intent.id === intentId);
    if (index === -1) return null;

    const [queued] = this.queue.splice(index, 1);
    queued.status = 'sent';
    this.sentIntents.set(intentId, queued);
    
    this.emit({ type: 'sent', intent: queued });
    return queued;
  }

  /**
   * Update status of sent intent
   */
  updateStatus(intentId: string, status: QueuedIntent['status']): QueuedIntent | null {
    const sent = this.sentIntents.get(intentId);
    if (!sent) return null;

    sent.status = status;
    this.emit({ type: 'status_change', intent: sent });
    return sent;
  }

  /**
   * Remove intent from queue/sent tracking
   */
  remove(intentId: string): boolean {
    // Check queue
    const index = this.queue.findIndex(q => q.intent.id === intentId);
    if (index !== -1) {
      const [removed] = this.queue.splice(index, 1);
      this.emit({ type: 'removed', intentId });
      return true;
    }

    // Check sent
    if (this.sentIntents.has(intentId)) {
      this.sentIntents.delete(intentId);
      this.emit({ type: 'removed', intentId });
      return true;
    }

    return false;
  }

  // === Undo Support ===

  /**
   * Get most recent committed intent (for undo)
   */
  getLastCommitted(): QueuedIntent | null {
    for (let i = this.sentIntents.size - 1; i >= 0; i--) {
      const sent = Array.from(this.sentIntents.values())[i];
      if (sent.status === 'committed') {
        return sent;
      }
    }
    return null;
  }

  // === Queue Status ===

  getPendingCount(): number {
    return this.queue.length;
  }

  getSentCount(): number {
    return this.sentIntents.size;
  }

  isEmpty(): boolean {
    return this.queue.length === 0 && this.sentIntents.size === 0;
  }

  getAll(): QueuedIntent[] {
    return [...this.queue, ...Array.from(this.sentIntents.values())];
  }

  // === Event System ===

  subscribe(listener: (event: QueueEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: QueueEvent): void {
    this.listeners.forEach(l => l(event));
  }

  // === Cleanup ===

  clear(): void {
    this.queue = [];
    this.sentIntents.clear();
    this.emit({ type: 'cleared' });
  }

  resetSustainedCount(): void {
    this.sustainedCount = 0;
  }
}

// === Event Types ===

export type QueueEvent =
  | { type: 'enqueued'; intent: QueuedIntent }
  | { type: 'sent'; intent: QueuedIntent }
  | { type: 'status_change'; intent: QueuedIntent }
  | { type: 'removed'; intentId: string }
  | { type: 'overflow_queue'; droppedId?: string }
  | { type: 'overflow_sustained'; dropped: GestureIntent }
  | { type: 'cleared' };

// Singleton
export const intentQueue = new IntentQueue();
