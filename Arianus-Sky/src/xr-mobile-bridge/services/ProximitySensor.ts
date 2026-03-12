import {
  ProximityZone,
  ProximityConfig,
  DEFAULT_PROXIMITY_CONFIG,
} from '../types';

export interface ProximitySensorOptions {
  config?: Partial<ProximityConfig>;
  onZoneChange?: (zone: ProximityZone, distance: number) => void;
  onWake?: () => void;
  onSleep?: () => void;
  sleepTimeout?: number; // ms after leaving near zone
}

export class ProximitySensor {
  private config: ProximityConfig;
  private currentZone: ProximityZone = 'far';
  private isActive = false;
  private sleepTimeout: ReturnType<typeof setTimeout> | null = null;
  private options: ProximitySensorOptions;

  constructor(options: ProximitySensorOptions = {}) {
    this.config = { ...DEFAULT_PROXIMITY_CONFIG, ...options.config };
    this.options = options;
  }

  getZone(): ProximityZone {
    return this.currentZone;
  }

  isArmed(): boolean {
    return this.currentZone === 'mid' || 
           this.currentZone === 'near' || 
           this.currentZone === 'intimate';
  }

  isActive(): boolean {
    return this.isActive;
  }

  update(distance: number): ProximityZone {
    const previousZone = this.currentZone;
    const newZone = this.getZoneFromDistance(distance);

    if (newZone !== previousZone) {
      this.currentZone = newZone;
      this.options.onZoneChange?.(newZone, distance);

      // Handle wake/sleep
      if (newZone === 'near' || newZone === 'intimate') {
        this.wake();
      } else if (previousZone === 'near' || previousZone === 'intimate') {
        this.scheduleSleep();
      }
    }

    return newZone;
  }

  private getZoneFromDistance(distance: number): ProximityZone {
    if (distance > this.config.farThreshold) {
      return 'far';
    } else if (distance > this.config.midThreshold) {
      return 'mid';
    } else if (distance > this.config.nearThreshold) {
      return 'near';
    } else {
      return 'intimate';
    }
  }

  private wake(): void {
    if (!this.isActive) {
      this.isActive = true;
      this.clearSleepTimeout();
      this.options.onWake?.();
    }
  }

  private scheduleSleep(): void {
    const timeout = this.options.sleepTimeout ?? 3000;
    this.sleepTimeout = setTimeout(() => {
      if (this.currentZone !== 'near' && this.currentZone !== 'intimate') {
        this.sleep();
      }
    }, timeout);
  }

  private sleep(): void {
    if (this.isActive) {
      this.isActive = false;
      this.options.onSleep?.();
    }
  }

  private clearSleepTimeout(): void {
    if (this.sleepTimeout) {
      clearTimeout(this.sleepTimeout);
      this.sleepTimeout = null;
    }
  }

  destroy(): void {
    this.clearSleepTimeout();
  }
}

// Web API Proximity Sensor (if available)
export function isProximitySensorAvailable(): boolean {
  return 'ProximitySensor' in window || 'onuserproximity' in window;
}

export async function startProximityMonitoring(
  callback: (distance: number) => void
): Promise<() => void> {
  // Try Web Proximity Sensor API first
  if ('ProximitySensor' in window) {
    const sensor = new (window as any).ProximitySensor({ frequency: 60 });
    
    sensor.onreading = () => {
      callback(sensor.proximity ?? 0);
    };

    sensor.start();
    
    return () => sensor.stop();
  }

  // Fallback: use ambient light sensor as proximity proxy (some devices)
  if ('AmbientLightSensor' in window) {
    console.warn('Proximity sensor unavailable, using AmbientLightSensor as proxy');
    const sensor = new (window as any).AmbientLightSensor();
    
    sensor.onreading = () => {
      // Inverse relationship - brighter = closer
      const illuminance = sensor.illuminance ?? 100;
      const distance = Math.max(0, 100 - illuminance);
      callback(distance);
    };

    sensor.start();
    
    return () => sensor.stop();
  }

  // Final fallback: no proximity (always far)
  console.warn('No proximity sensor available');
  return () => {};
}
