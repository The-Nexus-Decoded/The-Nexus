// UndoManager - 3-second undo window
// Implements: Undo Window: 3 seconds
// Handles undo requests within the temporal window

import { GestureIntent } from './GestureIntent';

export interface UndoableAction {
  intentId: string;
  intent: GestureIntent;
  committedAt: number;
  transform?: {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number; w: number };
    scale?: number;
  };
}

const UNDO_WINDOW_MS = 3000; // 3 seconds

export class UndoManager {
  private undoStack: UndoableAction[] = [];
  private listeners: Set<(event: UndoEvent) => void> = new Set();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup timer to remove expired actions
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, 1000) as unknown as NodeJS.Timeout;
  }

  // === Core Undo Operations ===

  /**
   * Record a committed action that can be undone
   */
  recordCommit(
    intentId: string,
    intent: GestureIntent,
    transform?: UndoableAction['transform']
  ): void {
    // Remove any previous action with same intentId (replace)
    this.undoStack = this.undoStack.filter(a => a.intentId !== intentId);

    const action: UndoableAction = {
      intentId,
      intent,
      committedAt: Date.now(),
      transform
    };

    this.undoStack.push(action);
    this.emit({ type: 'action_recorded', action });
  }

  /**
   * Attempt to undo the most recent action
   * Returns: true if undo was within window, false if expired
   */
  undo(): UndoableAction | null {
    const action = this.undoStack.pop();
    if (!action) {
      this.emit({ type: 'undo_failed', reason: 'no_actions' });
      return null;
    }

    const elapsed = Date.now() - action.committedAt;
    
    if (elapsed > UNDO_WINDOW_MS) {
      // Outside undo window
      this.emit({ type: 'undo_failed', reason: 'expired', action });
      return null;
    }

    this.emit({ type: 'undo_executed', action });
    return action;
  }

  /**
   * Check if undo is currently available
   */
  canUndo(): boolean {
    if (this.undoStack.length === 0) return false;
    
    const lastAction = this.undoStack[this.undoStack.length - 1];
    const elapsed = Date.now() - lastAction.committedAt;
    return elapsed <= UNDO_WINDOW_MS;
  }

  /**
   * Get remaining undo time in ms (0 if no undo available)
   */
  getRemainingTime(): number {
    if (this.undoStack.length === 0) return 0;
    
    const lastAction = this.undoStack[this.undoStack.length - 1];
    const elapsed = Date.now() - lastAction.committedAt;
    return Math.max(0, UNDO_WINDOW_MS - elapsed);
  }

  /**
   * Clear undo history (e.g., on session end)
   */
  clear(): void {
    this.undoStack = [];
    this.emit({ type: 'cleared' });
  }

  // === Internal ===

  private cleanupExpired(): void {
    const now = Date.now();
    const before = this.undoStack.length;
    
    this.undoStack = this.undoStack.filter(action => {
      return (now - action.committedAt) <= UNDO_WINDOW_MS;
    });

    if (this.undoStack.length !== before) {
      this.emit({ type: 'expired_cleaned', remaining: this.undoStack.length });
    }
  }

  // === Event System ===

  subscribe(listener: (event: UndoEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: UndoEvent): void {
    this.listeners.forEach(l => l(event));
  }

  // === Cleanup ===

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.undoStack = [];
    this.listeners.clear();
  }
}

// === Event Types ===

export type UndoEvent =
  | { type: 'action_recorded'; action: UndoableAction }
  | { type: 'undo_executed'; action: UndoableAction }
  | { type: 'undo_failed'; reason: 'no_actions' | 'expired'; action?: UndoableAction }
  | { type: 'expired_cleaned'; remaining: number }
  | { type: 'cleared' };

// Singleton
export const undoManager = new UndoManager();
