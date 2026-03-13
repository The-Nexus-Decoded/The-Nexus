// ThermalMonitor - iOS/Android thermal state tracking
// Implements AmbientSkin Contract: thermal self-preservation
// Nominal (<35°C): Tier as-set
// Throttling (35-38°C): Auto-bump one tier higher
// Critical (>38°C): Max tier, force-reduce activity

import { Platform, NativeModules, DeviceEventEmitter } from 'react-native';

export type ThermalState = 'nominal' | 'throttling' | 'critical';

export interface ThermalConfig {
  nominalThreshold: number;    // °C
  throttlingThreshold: number; // °C
  criticalThreshold: number;    // °C
}

const DEFAULT_THERMAL_CONFIG: ThermalConfig = {
  nominalThreshold: 35,
  throttlingThreshold: 38,
  criticalThreshold: 40
};

type ThermalChangeListener = (state: ThermalState, temperature?: number) => void;

export class ThermalMonitor {
  private config: ThermalConfig;
  private listeners: Set<ThermalChangeListener> = new Set();
  private currentState: ThermalState = 'nominal';
  private nativeSubscription: any = null;

  constructor(config: Partial<ThermalConfig> = {}) {
    this.config = { ...DEFAULT_THERMAL_CONFIG, ...config };
    this.setupNativeMonitoring();
  }

  private setupNativeMonitoring(): void {
    if (Platform.OS === 'ios') {
      this.setupIOSMonitoring();
    } else if (Platform.OS === 'android') {
      this.setupAndroidMonitoring();
    }
  }

  private setupIOSMonitoring(): void {
    // iOS: Use ProcessInfo.thermalState (app-only, not system-wide)
    // Note: VR app must push thermal warnings to mobile
    // This monitors the companion app's thermal state
    
    try {
      const { ThermalManager } = NativeModules;
      
      if (ThermalManager) {
        // Native module provides real-time thermal data
        this.nativeSubscription = DeviceEventEmitter.addListener(
          'ThermalStateChange',
          (event: { state: string; temperature?: number }) => {
            this.handleThermalEvent(event.state, event.temperature);
          }
        );
      } else {
        // Fallback: poll ProcessInfo.thermalState periodically
        this.startPolling();
      }
    } catch (e) {
      console.warn('Thermal monitoring setup failed:', e);
      this.startPolling();
    }
  }

  private setupAndroidMonitoring(): void {
    // Android: Use PowerManager thermal status
    try {
      const { ThermalManager } = NativeModules;
      
      if (ThermalManager) {
        this.nativeSubscription = DeviceEventEmitter.addListener(
          'ThermalStatusChange',
          (event: { status: string; temperature?: number }) => {
            this.mapAndroidThermalStatus(event.status, event.temperature);
          }
        );
      } else {
        this.startPolling();
      }
    } catch (e) {
      console.warn('Thermal monitoring setup failed:', e);
      this.startPolling();
    }
  }

  private pollingInterval: NodeJS.Timeout | null = null;

  private startPolling(): void {
    // Fallback: poll every 30 seconds
    this.pollingInterval = setInterval(() => {
      this.pollThermalState();
    }, 30000) as unknown as NodeJS.Timeout;
  }

  private async pollThermalState(): Promise<void> {
    // Placeholder for ProcessInfo.thermalState check
    // In production, would use @react-native-community/hooks or similar
    this.handleThermalEvent('nominal');
  }

  private handleThermalEvent(nativeState: string, temperature?: number): void {
    let newState: ThermalState;

    // Map native thermal state to our states
    // Note: VR app pushes warnings to mobile - this is the mobile-side handler
    if (nativeState === 'nominal' || nativeState === 'fair') {
      newState = 'nominal';
    } else if (nativeState === 'serious') {
      newState = 'throttling';
    } else if (nativeState === 'critical') {
      newState = 'critical';
    } else {
      // Fallback: use temperature if provided
      if (temperature !== undefined) {
        newState = this.getStateFromTemperature(temperature);
      } else {
        newState = 'nominal';
      }
    }

    if (newState !== this.currentState) {
      this.currentState = newState;
      this.notifyListeners(newState, temperature);
    }
  }

  private mapAndroidThermalStatus(status: string, temperature?: number): void {
    // Android thermal status mapping
    const statusMap: Record<string, ThermalState> = {
      NONE: 'nominal',
      LIGHT: 'nominal',
      MODERATE: 'throttling',
      SEVERE: 'critical',
      EMERGENCY: 'critical',
      SHUTDOWN: 'critical'
    };

    const newState = statusMap[status] || this.getStateFromTemperature(temperature);
    
    if (newState !== this.currentState) {
      this.currentState = newState;
      this.notifyListeners(newState, temperature);
    }
  }

  private getStateFromTemperature(tempCelsius: number): ThermalState {
    if (tempCelsius < this.config.nominalThreshold) {
      return 'nominal';
    } else if (tempCelsius < this.config.throttlingThreshold) {
      return 'throttling';
    } else {
      return 'critical';
    }
  }

  private notifyListeners(state: ThermalState, temperature?: number): void {
    this.listeners.forEach(listener => listener(state, temperature));
  }

  // === Public API ===

  getState(): ThermalState {
    return this.currentState;
  }

  subscribe(listener: ThermalChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Handle thermal warning from VR app (per spec: "VR app must push thermal warnings to mobile")
  handleVRThermalWarning(temperature: number): void {
    const newState = this.getStateFromTemperature(temperature);
    
    if (newState !== this.currentState) {
      this.currentState = newState;
      this.notifyListeners(newState, temperature);
    }
  }

  destroy(): void {
    if (this.nativeSubscription) {
      this.nativeSubscription.remove();
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    this.listeners.clear();
  }
}

// Singleton
export const thermalMonitor = new ThermalMonitor();
