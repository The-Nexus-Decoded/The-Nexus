/**
 * ZDepthSync - Z-axis synchronization
 * Last writer wins, 0.5 units/sec max delta
 * 
 * @author Paithan
 * @date 2026-03-09
 */

import { ZDepthState, ZDepthConfig } from './types';

const DEFAULT_CONFIG: ZDepthConfig = {
  authority: 'last_writer_wins',
  maxDeltaPerSecond: 0.5,
  fallback: 'vr',
  confidenceThreshold: 0.85
};

export class ZDepthSync {
  private state: ZDepthState;
  private config: ZDepthConfig;
  private listeners: Set<(state: ZDepthState) => void> = new Set();
  
  // Rate limiting
  private lastWriteTime: number = 0;
  private lastWriteValue: number = 0;
  private pendingWrite: { position: number; writer: 'mobile' | 'vr' } | null = null;

  constructor(config: Partial<ZDepthConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      position: 0,
      lastWriter: 'vr',
      lastUpdated: Date.now()
    };
  }

  /**
   * Get current Z depth state
   */
  getState(): ZDepthState {
    return { ...this.state };
  }

  /**
   * Get current position
   */
  getPosition(): number {
    return this.state.position;
  }

  /**
   * Get last writer
   */
  getLastWriter(): 'mobile' | 'vr' {
    return this.state.lastWriter;
  }

  /**
   * Mobile commits gesture
   * @param position - Z position
   * @param confidence - gesture confidence (0-1)
   * @returns true if committed, false if queued for VR confirmation
   * 
   * Logic:
   * - confidence >= 0.85: Mobile commits, VR animates to match
   * - confidence < 0.85: Mobile queues for VR confirmation
   */
  mobileWrites(position: number, confidence: number): boolean {
    // Confidence threshold check
    if (confidence < this.config.confidenceThreshold) {
      console.warn(`[ZDepthSync] Low confidence (${confidence.toFixed(2)}), queuing for VR confirmation`);
      this.pendingWrite = { position, writer: 'mobile' };
      return false;
    }

    // Rate limit: max 0.5 units/sec
    if (!this.checkRateLimit(position, 'mobile')) {
      console.warn('[ZDepthSync] Rate limit exceeded, queuing write');
      this.pendingWrite = { position, writer: 'mobile' };
      return false;
    }

    this.applyWrite(position, 'mobile');
    return true;
  }

  /**
   * VR confirms gesture (confidence < 0.85)
   * VR Z propagates to mobile
   */
  vrWrites(position: number): void {
    this.applyWrite(position, 'vr');
    
    // Process any pending mobile write if now within rate limit
    if (this.pendingWrite && this.checkRateLimit(this.pendingWrite.position, 'mobile')) {
      const pending = this.pendingWrite;
      this.pendingWrite = null;
      this.applyWrite(pending.position, pending.writer);
    }
  }

  /**
   * Apply write with rate limiting
   */
  private checkRateLimit(position: number, writer: 'mobile' | 'vr'): boolean {
    const now = Date.now();
    const timeDelta = (now - this.lastWriteTime) / 1000; // seconds
    const positionDelta = Math.abs(position - this.lastWriteValue);
    
    const maxAllowedDelta = timeDelta * this.config.maxDeltaPerSecond;
    
    return positionDelta <= maxAllowedDelta;
  }

  /**
   * Apply position write
   */
  private applyWrite(position: number, writer: 'mobile' | 'vr'): void {
    this.state = {
      position,
      lastWriter: writer,
      lastUpdated: Date.now()
    };
    
    this.lastWriteTime = Date.now();
    this.lastWriteValue = position;
    
    this.notifyListeners();
  }

  /**
   * Handle VR fallback
   * Called when mobile confidence < 0.85, VR takes authority
   */
  fallbackToVR(): void {
    // VR is authoritative - mobile should sync to VR position
    // This would be triggered by receiving VR state update
    console.log('[ZDepthSync] Falling back to VR authority');
  }

  /**
   * Check if mobile has authority
   */
  hasMobileAuthority(): boolean {
    return this.state.lastWriter === 'mobile';
  }

  /**
   * Get pending write (for UI indication)
   */
  getPendingWrite(): { position: number; writer: 'mobile' | 'vr' } | null {
    return this.pendingWrite;
  }

  /**
   * Cancel pending write
   */
  cancelPending(): void {
    this.pendingWrite = null;
  }

  /**
   * Subscribe to depth changes
   */
  subscribe(listener: (state: ZDepthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // === Conflict Resolution ===

  /**
   * Handle impossible action
   */
  static handleImpossibleAction(reason: string): { action: 'reject'; explanation: string } {
    return {
      action: 'reject',
      explanation: reason
    };
  }

  /**
   * Handle stale position
   */
  static transformToNearestValid(position: number, validRange: { min: number; max: number }): number {
    if (position < validRange.min) return validRange.min;
    if (position > validRange.max) return validRange.max;
    return position;
  }
}

// Singleton
export const zDepthSync = new ZDepthSync();
