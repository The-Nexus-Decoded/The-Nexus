/**
 * PreviewQueue - Ephemeral preview card management
 * Separate from action queue - previews are non-binding
 * 
 * @author Paithan
 * @date 2026-03-09
 */

import { PreviewItem, PreviewQueueConfig, IntentType } from './types';

const DEFAULT_CONFIG: PreviewQueueConfig = {
  queue_max: 3,
  on_overflow: 'drop_oldest',
  ambient_behavior: 'queue'
};

export class PreviewQueue {
  private queue: PreviewItem[] = [];
  private config: PreviewQueueConfig;
  private listeners: Set<(queue: PreviewItem[]) => void> = new Set();
  private ambientQueue: PreviewItem[] = []; // Background-queued items

  constructor(config: Partial<PreviewQueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current queue (preview items)
   */
  getQueue(): PreviewItem[] {
    return [...this.queue];
  }

  /**
   * Get queue length
   */
  length(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is full
   */
  isFull(): boolean {
    return this.queue.length >= this.config.queue_max;
  }

  /**
   * Add preview item
   */
  add(item: Omit<PreviewItem, 'id' | 'timestamp' | 'ephemeral'>): string {
    const previewItem: PreviewItem = {
      ...item,
      id: `preview_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      ephemeral: true
    };

    if (this.isFull()) {
      return this.handleOverflow(previewItem);
    }

    this.queue.push(previewItem);
    this.notifyListeners();
    
    return previewItem.id;
  }

  /**
   * Handle queue overflow
   */
  private handleOverflow(item: PreviewItem): string {
    switch (this.config.on_overflow) {
      case 'drop_oldest':
        this.queue.shift(); // Remove oldest
        this.queue.push(item);
        this.notifyListeners();
        return item.id;
        
      case 'drop_all':
        // Don't add new item, just return null
        return '';
    }
  }

  /**
   * Remove preview by ID
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex(item => item.id === id);
    if (index === -1) return false;
    
    this.queue.splice(index, 1);
    this.notifyListeners();
    return true;
  }

  /**
   * Get preview by ID
   */
  get(id: string): PreviewItem | undefined {
    return this.queue.find(item => item.id === id);
  }

  /**
   * Clear all previews
   */
  clear(): void {
    this.queue = [];
    this.notifyListeners();
  }

  /**
   * Handle app background / session end
   * Per spec: ephemeral - disappears on app background or session end
   */
  onBackground(): void {
    // Move to ambient queue if configured
    if (this.config.ambient_behavior === 'queue') {
      this.ambientQueue = [...this.queue];
    }
    this.queue = [];
    this.notifyListeners();
  }

  /**
   * Handle app foreground / session resume
   */
  onForeground(): void {
    if (this.config.ambient_behavior === 'queue' && this.ambientQueue.length > 0) {
      // Restore from ambient queue
      this.queue = [...this.ambientQueue].slice(-this.config.queue_max);
      this.ambientQueue = [];
    }
    this.notifyListeners();
  }

  /**
   * Get item at front of queue (oldest)
   */
  peek(): PreviewItem | undefined {
    return this.queue[0];
  }

  /**
   * Get newest item
   */
  peekNewest(): PreviewItem | undefined {
    return this.queue[this.queue.length - 1];
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: (queue: PreviewItem[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getQueue()));
  }

  /**
   * Update config
   */
  setConfig(config: Partial<PreviewQueueConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get config
   */
  getConfig(): PreviewQueueConfig {
    return { ...this.config };
  }

  // === Intent-aware methods ===

  /**
   * Add preview for gesture intent
   */
  addGesturePreview(
    intentType: IntentType,
    position: { x: number; y: number },
    magnitude: number
  ): string {
    return this.add({
      type: 'gesture',
      payload: {
        intentType,
        position,
        magnitude,
        previewType: this.getPreviewTypeForIntent(intentType)
      }
    });
  }

  /**
   * Get preview type for intent
   */
  private getPreviewTypeForIntent(intentType: IntentType): string {
    switch (intentType) {
      case 'movement': return 'ghost_wireframe';
      case 'menu': return 'menu_preview';
      case 'cast': return 'spell_preview';
      case 'combat': return 'target_preview';
      case 'trade': return 'offer_preview';
      case 'social': return 'message_preview';
      default: return 'generic';
    }
  }
}

// Singleton
export const previewQueue = new PreviewQueue();
