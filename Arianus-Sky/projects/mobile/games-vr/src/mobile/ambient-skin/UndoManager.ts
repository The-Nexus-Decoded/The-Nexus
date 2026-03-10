/**
 * UndoManager - 3-second temporal window for undo operations
 * Per XRPC-SPEC.md Section 5
 */
import { SpatialIntent } from './types';

export interface UndoableAction {
  id: string;
  intent: SpatialIntent;
  timestamp: number;
  executed: boolean;
  undone: boolean;
}

export const UNDO_WINDOW_MS = 3000; // 3 seconds

export class UndoManager {
  private actions: UndoableAction[] = [];
  private onUndoCallback?: (action: UndoableAction) => void;
  private onExecuteCallback?: (action: UndoableAction) => void;

  /**
   * Register an action that can be undone
   */
  register(id: string, intent: SpatialIntent): void {
    // Remove oldest if window full
    const now = Date.now();
    this.actions = this.actions.filter(
      a => now - a.timestamp < UNDO_WINDOW_MS
    );

    this.actions.push({
      id,
      intent,
      timestamp: now,
      executed: true,
      undone: false,
    });

    this.onExecuteCallback?.(this.actions[this.actions.length - 1]);
  }

  /**
   * Attempt to undo an action by ID
   * @returns true if undone, false if too late or not found
   */
  undo(id: string): boolean {
    const action = this.actions.find(a => a.id === id);
    if (!action || action.undone) return false;

    const elapsed = Date.now() - action.timestamp;
    if (elapsed >= UNDO_WINDOW_MS) return false;

    action.undone = true;
    this.onUndoCallback?.(action);
    return true;
  }

  /**
   * Undo the most recent action
   */
  undoLast(): boolean {
    const actionable = this.actions
      .filter(a => a.executed && !a.undone)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (actionable.length === 0) return false;
    return this.undo(actionable[0].id);
  }

  /**
   * Check if an action can still be undone
   */
  canUndo(id: string): boolean {
    const action = this.actions.find(a => a.id === id);
    if (!action || action.undone) return false;

    const elapsed = Date.now() - action.timestamp;
    return elapsed < UNDO_WINDOW_MS;
  }

  /**
   * Get time remaining until action expires from undo window
   */
  getTimeRemaining(id: string): number {
    const action = this.actions.find(a => a.id === id);
    if (!action || action.undone) return 0;

    const elapsed = Date.now() - action.timestamp;
    return Math.max(0, UNDO_WINDOW_MS - elapsed);
  }

  /**
   * Get all actionable (undoable) actions
   */
  getActionable(): UndoableAction[] {
    const now = Date.now();
    return this.actions.filter(
      a => a.executed && !a.undone && (now - a.timestamp < UNDO_WINDOW_MS)
    );
  }

  /**
   * Set callback for undo events
   */
  onUndo(callback: (action: UndoableAction) => void): void {
    this.onUndoCallback = callback;
  }

  /**
   * Set callback for execute events
   */
  onExecute(callback: (action: UndoableAction) => void): void {
    this.onExecuteCallback = callback;
  }

  /**
   * Clear expired actions
   */
  cleanup(): void {
    const now = Date.now();
    this.actions = this.actions.filter(
      a => now - a.timestamp < UNDO_WINDOW_MS
    );
  }

  /**
   * Clear all actions
   */
  clear(): void {
    this.actions = [];
  }
}

export default UndoManager;
