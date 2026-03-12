// Intent Queue - 3-Deep FIFO
// Buffers outgoing intents when XR side is busy/slow

import { GestureIntentPayload, GESTURE_CONFIG } from './gesture-types';

interface QueuedIntent {
  payload: GestureIntentPayload;
  timestamp: number;
  retries: number;
}

export class IntentQueue {
  private queue: QueuedIntent[] = [];
  private maxDepth: number;
  private processing: boolean = false;
  private onFlush: ((payload: GestureIntentPayload) => Promise<void>) | null = null;

  constructor(maxDepth: number = GESTURE_CONFIG.INTENT_QUEUE_DEPTH) {
    this.maxDepth = maxDepth;
  }

  /**
   * Set the flush callback (called when queue drains)
   */
  onFlushIntent(callback: (payload: GestureIntentPayload) => Promise<void>): void {
    this.onFlush = callback;
  }

  /**
   * Enqueue an intent (FIFO)
   * Drops oldest if at capacity
   */
  enqueue(payload: GestureIntentPayload): void {
    const entry: QueuedIntent = {
      payload,
      timestamp: Date.now(),
      retries: 0
    };

    // If full, drop oldest
    if (this.queue.length >= this.maxDepth) {
      const dropped = this.queue.shift();
      console.warn('[IntentQueue] Dropped oldest intent:', dropped?.payload.type);
    }

    this.queue.push(entry);
    
    // Try to process
    this.processQueue();
  }

  /**
   * Get current queue depth
   */
  getDepth(): number {
    return this.queue.length;
  }

  /**
   * Check if queue has capacity
   */
  hasCapacity(): boolean {
    return this.queue.length < this.maxDepth;
  }

  /**
   * Clear all queued intents
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Process queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0 || !this.onFlush) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const entry = this.queue[0]; // Peek
      
      try {
        await this.onFlush!(entry.payload);
        this.queue.shift(); // Remove successful
      } catch (error) {
        entry.retries++;
        
        // Max 3 retries then drop
        if (entry.retries >= 3) {
          console.error('[IntentQueue] Max retries exceeded, dropping:', entry.payload.type);
          this.queue.shift();
        } else {
          // Backoff and retry
          await new Promise(r => setTimeout(r, 100 * entry.retries));
        }
      }
    }

    this.processing = false;
  }

  /**
   * Force flush - process all pending immediately
   */
  async flush(): Promise<void> {
    await this.processQueue();
  }
}

export default IntentQueue;
