/**
 * ThermalMonitor - Device temperature monitoring
 * Manages thermal context and coordinates with immersion depth
 * 
 * @author Paithan
 * @date 2026-03-09
 */

import { ThermalTier, ThermalState, ThermalThresholds } from './types';
import { immersionContext } from './ImmersionContext';

export type ThermalChangeListener = (state: ThermalState) => void;

const THERMAL_THRESHOLDS: ThermalThresholds = {
  Nominal: 35,
  Throttling: 38
};

const MONITOR_INTERVAL_MS = 5000; // Check every 5 seconds

export class ThermalMonitor {
  private state: ThermalState;
  private listeners: Set<ThermalChangeListener> = new Set();
  private monitorInterval: number | null = null;
  private platformThermalAPI: ThermalReader | null = null;
  
  // Auto-escalation tracking
  private quietCount: number = 0;
  private readonly QUIET_THRESHOLD = 10; // 10 consecutive quiet checks = escalation eligible

  constructor() {
    this.state = {
      tier: 'Nominal',
      temperatureCelsius: 30, // Default assumed temp
      lastUpdated: Date.now()
    };
  }

  /**
   * Get current thermal state
   */
  getState(): ThermalState {
    return { ...this.state };
  }

  /**
   * Get current tier
   */
  getTier(): ThermalTier {
    return this.state.tier;
  }

  /**
   * Update temperature reading
   * Called by platform thermal API or simulation
   */
  updateTemperature(tempCelsius: number): void {
    const newTier = this.calculateTier(tempCelsius);
    const oldTier = this.state.tier;
    
    this.state = {
      tier: newTier,
      temperatureCelsius: tempCelsius,
      lastUpdated: Date.now()
    };

    // Sync with immersion context
    if (newTier !== oldTier) {
      immersionContext.setThermalTier(newTier);
    }

    // Auto-escalation: if climbing AND in quiet state
    if (this.shouldAutoEscalate(newTier, tempCelsius)) {
      this.handleThermalEscalation();
    }

    this.notifyListeners();
  }

  /**
   * Calculate tier from temperature
   */
  private calculateTier(tempCelsius: number): ThermalTier {
    if (tempCelsius < THERMAL_THRESHOLDS.Nominal) return 'Nominal';
    if (tempCelsius < THERMAL_THRESHOLDS.Thresholds) return 'Throttling';
    return 'Critical';
  }

  /**
   * Check if should auto-escalate urgency
   */
  private shouldAutoEscalate(tier: ThermalTier, temp: number): boolean {
    if (tier === 'Nominal') {
      this.quietCount++;
      return false;
    }
    
    // Reset quiet count if we're already in throttling/critical
    this.quietCount = 0;
    
    // Auto-escalate if climbing while quiet
    return this.quietCount >= this.QUIET_THRESHOLD;
  }

  /**
   * Handle thermal escalation
   */
  private handleThermalEscalation(): void {
    // Bump urgency tier if thermal climbs during quiet state
    const current = this.state.tier;
    
    if (current === 'Nominal') {
      // Will be bumped to Throttling on next update
      console.warn('[ThermalMonitor] Thermal climbing during quiet - escalating on next update');
    }
  }

  /**
   * Get action recommendation based on tier
   */
  getRecommendedAction(): string {
    switch (this.state.tier) {
      case 'Nominal':
        return 'Full fidelity, all features enabled';
      case 'Throttling':
        return 'Reduce particle effects, simplify shaders, expand touch targets';
      case 'Critical':
        return 'Graceful degradation, user alert, auto-save session';
    }
  }

  /**
   * Subscribe to thermal changes
   */
  subscribe(listener: ThermalChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Start monitoring (platform-specific)
   */
  startMonitoring(): void {
    if (this.monitorInterval) return;
    
    // Platform-specific thermal reading would be injected here
    // For now, this is a stub that would connect to:
    // - iOS: ProcessInfo thermalState
    // - Android: PowerManager thermal status
    // - Web: Battery API (limited)
    
    this.monitorInterval = window.setInterval(() => {
      this.simulateThermalRead();
    }, MONITOR_INTERVAL_MS);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * Simulate thermal reading (dev/testing)
   */
  private simulateThermalRead(): void {
    // In production, this would call platform APIs
    // For now, simulate gradual temp changes
    const variance = (Math.random() - 0.5) * 2; // ±1°C
    const newTemp = 32 + variance;
    this.updateTemperature(newTemp);
  }

  /**
   * Set platform thermal API
   */
  setPlatformThermalAPI(api: ThermalReader): void {
    this.platformThermalAPI = api;
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopMonitoring();
    this.listeners.clear();
  }
}

/**
 * Platform thermal reader interface
 */
export interface ThermalReader {
  getCurrentTemperature(): Promise<number>;
  onThermalStateChange(callback: (tier: ThermalTier) => void): void;
}

// Singleton
export const thermalMonitor = new ThermalMonitor();
