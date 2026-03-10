/**
 * AttentionLease - Immersion time management
 * User claims X minutes of immersion, system honors it
 * 
 * @author Paithan
 * @date 2026-03-09
 */

import { AttentionLease, LeaseConfig } from './types';
import { immersionContext } from './ImmersionContext';

export type LeaseChangeListener = (lease: AttentionLease | null, reason: 'expired' | 'released' | 'updated') => void;

const DEFAULT_LEASE_CONFIG: LeaseConfig = {
  lease_duration_minutes: 5,
  auto_resume: true,
  graceful_exit: true
};

export class AttentionLeaseManager {
  private config: LeaseConfig;
  private currentLease: AttentionLease | null = null;
  private listeners: Set<LeaseChangeListener> = new Set();
  private expiryTimer: number | null = null;

  constructor(config: Partial<LeaseConfig> = {}) {
    this.config = { ...DEFAULT_LEASE_CONFIG, ...config };
  }

  /**
   * Get current lease
   */
  getLease(): AttentionLease | null {
    return this.currentLease ? { ...this.currentLease } : null;
  }

  /**
   * Check if lease is active
   */
  isActive(): boolean {
    if (!this.currentLease) return false;
    return Date.now() < this.currentLease.expiresAt;
  }

  /**
   * Get remaining time in seconds
   */
  getRemainingSeconds(): number {
    if (!this.currentLease) return 0;
    const remaining = this.currentLease.expiresAt - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
  }

  /**
   * Get remaining time as formatted string
   */
  getRemainingFormatted(): string {
    const seconds = this.getRemainingSeconds();
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Claim immersion time
   */
  claim(durationMinutes?: number): AttentionLease {
    // Clear any existing lease
    this.clear();

    const duration = durationMinutes ?? this.config.lease_duration_minutes;
    const now = Date.now();
    
    this.currentLease = {
      durationMinutes: duration,
      startedAt: now,
      expiresAt: now + (duration * 60 * 1000),
      autoResume: this.config.auto_resume,
      gracefulExit: this.config.graceful_exit
    };

    // Sync with immersion context
    immersionContext.setLease(this.currentLease);

    // Set expiry timer
    this.scheduleExpiry(duration * 60 * 1000);

    this.notifyListeners(this.currentLease, 'updated');
    
    return this.currentLease;
  }

  /**
   * Extend lease
   */
  extend(additionalMinutes: number): AttentionLease | null {
    if (!this.currentLease) return null;

    const newExpiry = Date.now() + (additionalMinutes * 60 * 1000);
    
    this.currentLease = {
      ...this.currentLease,
      durationMinutes: this.currentLease.durationMinutes + additionalMinutes,
      expiresAt: newExpiry
    };

    // Reschedule expiry
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
    }
    this.scheduleExpiry(additionalMinutes * 60 * 1000);

    // Sync with immersion context
    immersionContext.setLease(this.currentLease);

    this.notifyListeners(this.currentLease, 'updated');
    
    return this.currentLease;
  }

  /**
   * Release lease early
   */
  release(): void {
    if (!this.currentLease) return;

    this.clear();
    immersionContext.setLease(null);
    
    // Transition based on graceful_exit setting
    if (this.config.graceful_exit) {
      immersionContext.transitionToPeripheral();
    } else {
      immersionContext.transitionToBackground();
    }

    this.notifyListeners(null, 'released');
  }

  /**
   * Handle lease expiry
   */
  private handleExpiry(): void {
    if (!this.currentLease) return;

    const lease = { ...this.currentLease };
    this.currentLease = null;
    this.expiryTimer = null;

    immersionContext.setLease(null);
    immersionContext.handleLeaseExpiry();

    this.notifyListeners(null, 'expired');

    // Auto-resume if enabled
    if (lease.autoResume) {
      console.log('[AttentionLease] Lease expired, auto-resume available');
    }
  }

  /**
   * Schedule lease expiry
   */
  private scheduleExpiry(durationMs: number): void {
    this.expiryTimer = window.setTimeout(() => {
      this.handleExpiry();
    }, durationMs);
  }

  /**
   * Clear lease and timer
   */
  private clear(): void {
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
    this.currentLease = null;
  }

  /**
   * Subscribe to lease changes
   */
  subscribe(listener: LeaseChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(lease: AttentionLease | null, reason: 'expired' | 'released' | 'updated'): void {
    this.listeners.forEach(listener => listener(lease, reason));
  }

  /**
   * Update config
   */
  setConfig(config: Partial<LeaseConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get config
   */
  getConfig(): LeaseConfig {
    return { ...this.config };
  }
}

// Singleton
export const attentionLease = new AttentionLeaseManager();
