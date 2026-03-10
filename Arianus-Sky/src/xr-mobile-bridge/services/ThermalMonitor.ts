import {
  ThermalTier,
  ThermalAdaptData,
  THERMAL_TIER_0,
  THERMAL_TIER_1,
  THERMAL_TIER_2,
  THERMAL_TIER_3,
} from '../types';

export interface ThermalMonitorOptions {
  checkInterval?: number; // ms
  onTierChange?: (tier: ThermalTier, data: ThermalAdaptData) => void;
  cooldownPeriod?: number; // ms, de-escalation delay
}

const DEFAULT_OPTIONS = {
  checkInterval: 2000,
  cooldownPeriod: 5000,
};

export class ThermalMonitor {
  private currentTier: ThermalTier = 0;
  private lastEscalationTime = 0;
  private lastDeEscalationTime = 0;
  private options: ThermalMonitorOptions & typeof DEFAULT_OPTIONS;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  constructor(options: ThermalMonitorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  getTier(): ThermalTier {
    return this.currentTier;
  }

  getThermalData(): ThermalAdaptData {
    return this.getAdaptDataForTier(this.currentTier);
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastEscalationTime = Date.now();
    this.lastDeEscalationTime = Date.now();

    this.intervalId = setInterval(() => {
      this.checkThermalState();
    }, this.options.checkInterval);

    // Initial check
    this.checkThermalState();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  private async checkThermalState(): Promise<void> {
    const temp = await this.getDeviceTemperature();
    const newTier = this.getTierFromTemperature(temp);
    
    if (newTier !== this.currentTier) {
      const now = Date.now();
      
      // Escalation is immediate
      if (newTier > this.currentTier) {
        this.currentTier = newTier;
        this.lastEscalationTime = now;
        this.lastDeEscalationTime = now;
        this.options.onTierChange?.(newTier, this.getThermalData());
      }
      // De-escalation requires cooldown
      else if (newTier < this.currentTier) {
        if (now - this.lastDeEscalationTime >= this.options.cooldownPeriod!) {
          this.currentTier = newTier;
          this.lastDeEscalationTime = now;
          this.options.onTierChange?.(newTier, this.getThermalData());
        }
      }
    }
  }

  private async getDeviceTemperature(): Promise<number> {
    // Try DeviceTemperature API (experimental)
    if ('temperature' in navigator && typeof (navigator as any).temperature === 'object') {
      try {
        // @ts-ignore - experimental API
        const temp = await (navigator as any).temperature.observe((reading: any) => {
          return reading;
        });
        return temp ?? 25; // Default to room temp if unavailable
      } catch (e) {
        // Fall through
      }
    }

    // Fallback: return mock temp for development
    // In production, this would come from native bridge
    return 25;
  }

  private getTierFromTemperature(temp: number): ThermalTier {
    if (temp < THERMAL_TIER_0) return 0;
    if (temp < THERMAL_TIER_1) return 1;
    if (temp < THERMAL_TIER_2) return 2;
    if (temp < THERMAL_TIER_3) return 3;
    return 4;
  }

  private getAdaptDataForTier(tier: ThermalTier): ThermalAdaptData {
    const tierData: Record<ThermalTier, ThermalAdaptData> = {
      0: { tier: 0, actions: [] },
      1: { tier: 1, actions: ['reduce_particles'] },
      2: { tier: 2, actions: ['reduce_particles', 'simplify_shaders'] },
      3: { tier: 3, actions: ['reduce_particles', 'simplify_shaders', 'flat_colors', 'no_blur'] },
      4: { tier: 4, actions: ['minimal_mode'] },
    };
    return tierData[tier];
  }

  destroy(): void {
    this.stop();
  }
}
