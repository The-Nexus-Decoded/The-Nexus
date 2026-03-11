// Undo Manager - 3 Second Window
// Tracks recent gestures for undo capability

import { GestureIntentPayload, GESTURE_CONFIG } from './gesture-types';

interface UndoEntry {
  payload: GestureIntentPayload;
  timestamp: number;
  undone: boolean;
}

export class UndoManager {
  private history: UndoEntry[] = [];
  private windowMs: number;
  private onUndo: ((payload: GestureIntentPayload) => void) | null = null;

  constructor(windowMs: number = GESTURE_CONFIG.UNDO_WINDOW_MS) {
    this.windowMs = windowMs;
    
    // Auto-cleanup expired entries
    setInterval(() => this.cleanup(), 1000);
  }

  /**
   * Set undo callback
   */
  onUndoGesture(callback: (payload: GestureIntentPayload) => void): void {
    this.onUndo = callback;
  }

  /**
   * Record a gesture for potential undo
   */
  record(payload: GestureIntentPayload): void {
    // Prune old entries first
    this.cleanup();

    // Limit history to last 10
    if (this.history.length >= 10) {
      this.history = this.history.slice(-9);
    }

    this.history.push({
      payload,
      timestamp: Date.now(),
      undone: false
    });
  }

  /**
   * Attempt to undo the last gesture
   * Returns true if undo was possible
   */
  undo(): boolean {
    // Find most recent non-undone entry within window
    const now = Date.now();
    
    for (let i = this.history.length - 1; i >= 0; i--) {
      const entry = this.history[i];
      
      if (entry.undone) continue;
      if (now - entry.timestamp > this.windowMs) continue;
      
      // Found valid undo candidate
      entry.undone = true;
      
      if (this.onUndo) {
        this.onUndo(entry.payload);
      }
      
      return true;
    }

    return false;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    const now = Date.now();
    return this.history.some(
      e => !e.undone && (now - e.timestamp) <= this.windowMs
    );
  }

  /**
   * Get time remaining for current undo (ms)
   */
  getUndoTimeRemaining(): number {
    const now = Date.now();
    const valid = this.history
      .filter(e => !e.undone)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    if (!valid) return 0;
    
    const remaining = this.windowMs - (now - valid.timestamp);
    return Math.max(0, remaining);
  }

  /**
   * Clear expired/old entries
   */
  private cleanup(): void {
    const now = Date.now();
    this.history = this.history.filter(
      e => (now - e.timestamp) <= this.windowMs || !e.undone
    );
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
  }
}

export default UndoManager;
