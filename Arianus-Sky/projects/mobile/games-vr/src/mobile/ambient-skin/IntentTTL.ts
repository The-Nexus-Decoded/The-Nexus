/**
 * IntentTTL - Time-to-live management by intent type
 * Movement needs fast sync, menu can wait
 * 
 * @author Paithan
 * @date 2026-03-09
 */

import { IntentType, TTLConfig } from './types';

const DEFAULT_TTL_CONFIG: TTLConfig = {
  ttl_ms_tiered: {
    cast: 5000,
    movement: 500,
    menu: 10000,
    combat: 2000,
    trade: 15000,
    social: 5000
  },
  priority: {
    high: 2000,
    normal: 5000,
    low: 15000
  }
};

export interface TTLSettings {
  ttl: number;
  priority: 'high' | 'normal' | 'low';
  retries: number;
}

export class IntentTTLManager {
  private config: TTLConfig;
  private activeTimeouts: Map<string, number> = new Map();

  constructor(config: Partial<TTLConfig> = {}) {
    this.config = { ...DEFAULT_TTL_CONFIG, ...config };
  }

  /**
   * Get TTL for intent type
   */
  getTTL(intentType: IntentType): number {
    return this.config.ttl_ms_tiered[intentType] ?? this.config.priority.normal;
  }

  /**
   * Get priority level for intent type
   */
  getPriorityLevel(intentType: IntentType): 'high' | 'normal' | 'low' {
    // Map intent types to priorities
    const priorityMap: Record<IntentType, 'high' | 'normal' | 'low'> = {
      cast: 'normal',
      movement: 'high',
      menu: 'low',
      combat: 'high',
      trade: 'low',
      social: 'normal'
    };
    
    return priorityMap[intentType] ?? 'normal';
  }

  /**
   * Get timeout value for priority
   */
  getPriorityTimeout(priority: 'high' | 'normal' | 'low'): number {
    return this.config.priority[priority];
  }

  /**
   * Get full TTL settings for intent
   */
  getSettings(intentType: IntentType): TTLSettings {
    return {
      ttl: this.getTTL(intentType),
      priority: this.getPriorityLevel(intentType),
      retries: this.getRetryCount(intentType)
    };
  }

  /**
   * Get retry count for intent type
   */
  private getRetryCount(intentType: IntentType): number {
    // High priority = more retries
    const priority = this.getPriorityLevel(intentType);
    switch (priority) {
      case 'high': return 3;
      case 'normal': return 2;
      case 'low': return 1;
    }
  }

  /**
   * Check if intent has expired
   */
  isExpired(intentType: IntentType, timestamp: number): boolean {
    const ttl = this.getTTL(intentType);
    return Date.now() - timestamp > ttl;
  }

  /**
   * Get remaining time before expiry
   */
  getRemainingMs(intentType: IntentType, timestamp: number): number {
    const ttl = this.getTTL(intentType);
    const remaining = ttl - (Date.now() - timestamp);
    return Math.max(0, remaining);
  }

  /**
   * Register active intent timeout
   */
  registerTimeout(intentId: string, intentType: IntentType, onTimeout: () => void): void {
    const ttl = this.getTTL(intentType);
    
    const timeoutId = window.setTimeout(() => {
      this.activeTimeouts.delete(intentId);
      onTimeout();
    }, ttl);
    
    this.activeTimeouts.set(intentId, timeoutId);
  }

  /**
   * Cancel intent timeout
   */
  cancelTimeout(intentId: string): void {
    const timeoutId = this.activeTimeouts.get(intentId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.activeTimeouts.delete(intentId);
    }
  }

  /**
   * Update TTL for intent type
   */
  setTTL(intentType: IntentType, ttl: number): void {
    this.config.ttl_ms_tiered[intentType] = ttl;
  }

  /**
   * Get all TTL values
   */
  getAllTTL(): Record<IntentType, number> {
    return { ...this.config.ttl_ms_tiered };
  }

  /**
   * Get all priority timeouts
   */
  getAllPriorities(): TTLConfig['priority'] {
    return { ...this.config.priority };
  }

  /**
   * Cleanup all active timeouts
   */
  cleanup(): void {
    for (const timeoutId of this.activeTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    this.activeTimeouts.clear();
  }

  /**
   * Create deadline for intent
   */
  createDeadline(intentType: IntentType): number {
    return Date.now() + this.getTTL(intentType);
  }

  /**
   * Check if deadline passed
   */
  isDeadlinePassed(deadline: number): boolean {
    return Date.now() > deadline;
  }
}

// Singleton
export const intentTTL = new IntentTTLManager();

// Intent type constants
export const INTENT_TYPES = {
  CAST: 'cast' as IntentType,
  MOVEMENT: 'movement' as IntentType,
  MENU: 'menu' as IntentType,
  COMBAT: 'combat' as IntentType,
  TRADE: 'trade' as IntentType,
  SOCIAL: 'social' as IntentType
};
