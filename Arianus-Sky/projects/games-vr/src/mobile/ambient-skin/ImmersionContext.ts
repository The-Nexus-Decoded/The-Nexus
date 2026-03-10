/**
 * ImmersionContext - Depth state management
 * Tracks immersion depth and coordinates with thermal/lease state
 * 
 * @author Paithan
 * @date 2026-03-09
 */

import { 
  ImmersionDepth, 
  ImmersionState, 
  ThermalContext, 
  ThermalTier,
  AttentionLease 
} from './types';

export type ImmersionChangeListener = (state: ImmersionState) => void;

const THERMAL_THRESHOLDS = {
  Nominal: 35,
  Throttling: 38
};

const VISUAL_DENSITY_MAP: Record<ImmersionDepth, 'expanded' | 'hybrid' | 'contracted'> = {
  'Full': 'expanded',
  'Peripheral': 'hybrid',
  'Background': 'contracted'
};

const TOUCH_TARGET_MAP: Record<ImmersionDepth, number> = {
  'Full': 44,
  'Peripheral': 44,
  'Background': 40
};

export class ImmersionContext {
  private state: ImmersionState;
  private listeners: Set<ImmersionChangeListener> = new Set();
  
  // Thermal compensation
  private thermalCompensation: ThermalTier = 'Nominal';

  constructor() {
    this.state = {
      depth: 'Full',
      lease: null,
      thermal: 'Nominal',
      timestamp: Date.now()
    };
  }

  /**
   * Get current immersion state
   */
  getState(): ImmersionState {
    return { ...this.state };
  }

  /**
   * Get current depth
   */
  getDepth(): ImmersionDepth {
    return this.state.depth;
  }

  /**
   * Set immersion depth
   */
  setDepth(depth: ImmersionDepth): void {
    if (this.state.depth === depth) return;
    
    this.state = {
      ...this.state,
      depth,
      timestamp: Date.now()
    };
    
    this.notifyListeners();
  }

  /**
   * Set attention lease
   */
  setLease(lease: AttentionLease | null): void {
    this.state = {
      ...this.state,
      lease,
      timestamp: Date.now()
    };
    
    this.notifyListeners();
  }

  /**
   * Get active lease
   */
  getLease(): AttentionLease | null {
    return this.state.lease;
  }

  /**
   * Check if lease is active
   */
  isLeaseActive(): boolean {
    if (!this.state.lease) return false;
    return Date.now() < this.state.lease.expiresAt;
  }

  /**
   * Update thermal tier
   */
  setThermalTier(tier: ThermalTier): void {
    this.thermalCompensation = tier;
    this.state = {
      ...this.state,
      thermal: tier,
      timestamp: Date.now()
    };
    
    this.notifyListeners();
  }

  /**
   * Get thermal tier
   */
  getThermalTier(): ThermalTier {
    return this.thermalCompensation;
  }

  /**
   * Get thermal tier from temperature reading
   */
  static getThermalTierFromTemp(tempCelsius: number): ThermalTier {
    if (tempCelsius < THERMAL_THRESHOLDS.Nominal) return 'Nominal';
    if (tempCelsius < THERMAL_THRESHOLDS.Throttling) return 'Throttling';
    return 'Critical';
  }

  /**
   * Get visual density based on depth + thermal
   */
  getVisualDensity(): 'expanded' | 'hybrid' | 'contracted' {
    if (this.thermalCompensation === 'Critical') return 'contracted';
    if (this.thermalCompensation === 'Throttling') return 'contracted';
    return VISUAL_DENSITY_MAP[this.state.depth];
  }

  /**
   * Get touch target size in pixels (compensated for thermal)
   */
  getTouchTargetSize(): number {
    let baseSize = TOUCH_TARGET_MAP[this.state.depth];
    
    // Expand touch targets when throttling to compensate for precision loss
    if (this.thermalCompensation === 'Throttling') {
      baseSize = 56;
    }
    
    return baseSize;
  }

  /**
   * Check if should reduce visual fidelity
   */
  shouldReduceFidelity(): boolean {
    return this.thermalCompensation !== 'Nominal';
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: ImmersionChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /**
   * Transition: Full → Peripheral
   */
  transitionToPeripheral(): void {
    this.setDepth('Peripheral');
  }

  /**
   * Transition: Peripheral → Background
   */
  transitionToBackground(): void {
    this.setDepth('Background');
  }

  /**
   * Transition: Any → Full (re-entry)
   */
  transitionToFull(): void {
    this.setDepth('Full');
  }

  /**
   * Handle lease expiry
   */
  handleLeaseExpiry(): void {
    if (this.state.lease?.gracefulExit) {
      this.transitionToPeripheral();
    } else {
      this.transitionToBackground();
    }
  }
}

// Singleton
export const immersionContext = new ImmersionContext();
