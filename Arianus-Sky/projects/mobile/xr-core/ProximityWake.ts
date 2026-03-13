// ProximityWake - iOS proximity sensor fallback
// Implements Mobile Platform Constraints: Proximity Wake
// iOS proximity sensor requires active audio session or VoIP call
// Fallback: motion-based wake via CMMotionManager pickup detection
// Alternative: notification-triggered wake

import { Platform, NativeModules, DeviceEventEmitter, AppState, AppStateStatus } from 'react-native';

export type WakeTrigger = 'motion' | 'notification' | 'proximity';

interface WakeConfig {
  motionThreshold: number;      // g-force change to trigger
  motionDebounceMs: number;    // debounce between triggers
  enableProximity: boolean;     // attempt proximity sensor first (iOS)
  enableMotion: boolean;        // fallback: motion detection
  enableNotifications: boolean; // fallback: notification wake
}

const DEFAULT_WAKE_CONFIG: WakeConfig = {
  motionThreshold: 1.5,        // Significant motion = pickup
  motionDebounceMs: 5000,      // 5 second cooldown
  enableProximity: true,
  enableMotion: true,
  enableNotifications: true
};

type WakeListener = (trigger: WakeTrigger, details?: any) => void;

export class ProximityWake {
  private config: WakeConfig;
  private listeners: Set<WakeListener> = new Set();
  private lastWakeTime = 0;
  private appStateSubscription: any = null;
  private motionSubscription: any = null;
  private isMonitoring = false;

  constructor(config: Partial<WakeConfig> = {}) {
    this.config = { ...DEFAULT_WAKE_CONFIG, ...config };
  }

  // Start monitoring for wake conditions
  start(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    if (Platform.OS === 'ios') {
      this.setupIOSWake();
    } else if (Platform.OS === 'android') {
      this.setupAndroidWake();
    }
  }

  private setupIOSWake(): void {
    // iOS Strategy:
    // 1. Try proximity sensor (requires active audio session - may fail)
    // 2. Fallback: motion-based pickup detection
    // 3. Alternative: app state change (notification wake)

    if (this.config.enableProximity) {
      this.setupProximitySensor();
    }

    if (this.config.enableMotion) {
      this.setupMotionDetection();
    }

    if (this.config.enableNotifications) {
      this.setupAppStateMonitoring();
    }
  }

  private setupAndroidWake(): void {
    // Android: Use sensor directly (no audio session requirement)
    // Proximity sensor works without special permissions
    
    if (this.config.enableProximity) {
      this.setupProximitySensor();
    }

    if (this.config.enableMotion) {
      this.setupMotionDetection();
    }

    if (this.config.enableNotifications) {
      this.setupAppStateMonitoring();
    }
  }

  private setupProximitySensor(): void {
    try {
      const { ProximitySensor } = NativeModules;

      if (ProximitySensor) {
        DeviceEventEmitter.addListener('ProximityStateChange', (event: { isNear: boolean }) => {
          if (event.isNear) {
            this.triggerWake('proximity');
          }
        });
        ProximitySensor.start();
      } else {
        // Fallback to motion if proximity unavailable
        console.warn('Proximity sensor not available, falling back to motion');
        this.setupMotionDetection();
      }
    } catch (e) {
      console.warn('Proximity sensor setup failed:', e);
      this.setupMotionDetection();
    }
  }

  private setupMotionDetection(): void {
    // Fallback: CMMotionManager pickup detection
    // Detects significant acceleration change (phone pickup)
    try {
      const { MotionManager } = NativeModules;

      if (MotionManager) {
        MotionManager.startAccelerometerUpdates((event: { x: number; y: number; z: number }) => {
          const magnitude = Math.sqrt(event.x ** 2 + event.y ** 2 + event.z ** 2);
          
          // Significant deviation from 1g (gravity) = pickup
          if (Math.abs(magnitude - 1) > this.config.motionThreshold) {
            this.triggerWake('motion', { magnitude });
          }
        });
      } else {
        console.warn('Motion manager not available');
      }
    } catch (e) {
      console.warn('Motion detection setup failed:', e);
    }
  }

  private setupAppStateMonitoring(): void {
    // Alternative: notification-triggered wake
    // App comes to foreground via notification tap
    this.appStateSubscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          // Check if this was a notification wake (vs manual open)
          // Would check notification payload in production
          this.triggerWake('notification');
        }
      }
    );
  }

  private triggerWake(trigger: WakeTrigger, details?: any): void {
    const now = Date.now();
    
    // Debounce
    if (now - this.lastWakeTime < this.config.motionDebounceMs) {
      return;
    }

    this.lastWakeTime = now;
    this.notifyListeners(trigger, details);
  }

  private notifyListeners(trigger: WakeTrigger, details?: any): void {
    this.listeners.forEach(listener => listener(trigger, details));
  }

  // === Public API ===

  onWake(listener: WakeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  stop(): void {
    if (!this.isMonitoring) return;
    this.isMonitoring = false;

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    // Stop motion manager
    try {
      const { MotionManager } = NativeModules;
      MotionManager?.stopAccelerometerUpdates();
    } catch (e) {
      // Ignore
    }

    // Stop proximity sensor
    try {
      const { ProximitySensor } = NativeModules;
      ProximitySensor?.stop();
    } catch (e) {
      // Ignore
    }
  }

  destroy(): void {
    this.stop();
    this.listeners.clear();
  }
}

// Singleton
export const proximityWake = new ProximityWake();
