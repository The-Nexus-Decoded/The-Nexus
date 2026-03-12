// SpatialBridgeManager - Mobile↔Spatial handoff orchestration
// Manages intent emission, state caching, latency tracking, and feedback coordination

import { 
  GestureIntent, 
  IntentContext, 
  CachedContext, 
  createGestureIntent 
} from './GestureIntent';
import { hapticBridge, HapticBridgeEvent } from './HapticBridge';
import { ConnectionStatus } from './LatencyIndicator';

// Bridge events for external subscribers
export type BridgeEventType = 
  | 'intent:emit'
  | 'intent:confirm'
  | 'intent:return'
  | 'state:cache'
  | 'state:restore'
  | 'latency:update'
  | 'connection:change';

export interface BridgeEvent {
  type: BridgeEventType;
  payload: unknown;
  timestamp: number;
}

export type BridgeEventListener = (event: BridgeEvent) => void;

// Configuration
export interface SpatialBridgeConfig {
  stateCacheTTL: number;      // ms before cached context expires
  latencyWarningThreshold: number;  // ms
  enableHaptics: boolean;
  enableStateCaching: boolean;
}

const DEFAULT_CONFIG: SpatialBridgeConfig = {
  stateCacheTTL: 300000,      // 5 minutes
  latencyWarningThreshold: 200,
  enableHaptics: true,
  enableStateCaching: true
};

export class SpatialBridgeManager {
  private config: SpatialBridgeConfig;
  private listeners: Set<BridgeEventListener> = new Set();
  
  // Connection state
  private connectionStatus: ConnectionStatus = 'disconnected';
  private lastLatencyMs: number | undefined;
  
  // Context cache for return handoffs
  private contextCache: Map<string, CachedContext> = new Map();
  
  // Latency tracking
  private latencyHistory: number[] = [];
  private readonly LATENCY_HISTORY_SIZE = 10;

  constructor(config: Partial<SpatialBridgeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    hapticBridge.setEnabled(this.config.enableHaptics);
  }

  // === Connection Management ===

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  setConnectionStatus(status: ConnectionStatus): void {
    const oldStatus = this.connectionStatus;
    this.connectionStatus = status;
    
    this.emit({
      type: 'connection:change',
      payload: { oldStatus, newStatus: status },
      timestamp: Date.now()
    });

    // Haptic feedback on connection change
    if (status === 'connected') {
      hapticBridge.onBridgeConnect();
    } else if (status === 'disconnected') {
      hapticBridge.onBridgeDisconnect();
    }
  }

  // === Latency Tracking ===

  getLatency(): number | undefined {
    return this.lastLatencyMs;
  }

  updateLatency(latencyMs: number): void {
    this.lastLatencyMs = latencyMs;
    
    // Track history for averaging
    this.latencyHistory.push(latencyMs);
    if (this.latencyHistory.length > this.LATENCY_HISTORY_SIZE) {
      this.latencyHistory.shift();
    }

    // Warning threshold check
    if (latencyMs > this.config.latencyWarningThreshold) {
      hapticBridge.onLatencyWarning();
      this.setConnectionStatus('warning');
    } else if (this.connectionStatus === 'warning') {
      this.setConnectionStatus('connected');
    }

    this.emit({
      type: 'latency:update',
      payload: { latencyMs, average: this.getAverageLatency() },
      timestamp: Date.now()
    });
  }

  getAverageLatency(): number {
    if (this.latencyHistory.length === 0) return 0;
    const sum = this.latencyHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latencyHistory.length);
  }

  // === Intent Emission ===

  async emitIntent(
    type: GestureIntent['type'],
    position: GestureIntent['position'],
    direction: GestureIntent['direction'],
    magnitude: number,
    duration: number,
    context: Partial<IntentContext>
  ): Promise<GestureIntent> {
    const intent = createGestureIntent(
      type,
      position,
      direction,
      magnitude,
      duration,
      context,
      { sourceDevice: 'mobile' }
    );

    // Haptic: intent emitted
    await hapticBridge.onIntentEmit();

    // Emit event
    this.emit({
      type: 'intent:emit',
      payload: intent,
      timestamp: Date.now()
    });

    // Cache context if enabled
    if (this.config.enableStateCaching) {
      this.cacheContext(intent);
    }

    return intent;
  }

  // Handle confirmation from spatial layer
  async onIntentConfirmed(intentId: string, latencyMs: number): Promise<void> {
    this.updateLatency(latencyMs);
    await hapticBridge.onIntentConfirm();

    this.emit({
      type: 'intent:confirm',
      payload: { intentId, latencyMs },
      timestamp: Date.now()
    });
  }

  // === State Caching ===

  private cacheContext(intent: GestureIntent): void {
    const cached: CachedContext = {
      intent,
      cachedAt: Date.now(),
      expiresAt: Date.now() + this.config.stateCacheTTL
    };
    
    this.contextCache.set(intent.context.returnToken, cached);

    this.emit({
      type: 'state:cache',
      payload: { returnToken: intent.context.returnToken },
      timestamp: Date.now()
    });

    // Cleanup expired entries periodically
    this.cleanupExpiredCache();
  }

  getCachedContext(returnToken: string): GestureIntent | null {
    const cached = this.contextCache.get(returnToken);
    
    if (!cached) return null;
    
    if (Date.now() > cached.expiresAt) {
      this.contextCache.delete(returnToken);
      return null;
    }

    this.emit({
      type: 'state:restore',
      payload: { returnToken },
      timestamp: Date.now()
    });

    // Haptic on return
    hapticBridge.onIntentReturn();

    return cached.intent;
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [token, cached] of this.contextCache.entries()) {
      if (now > cached.expiresAt) {
        this.contextCache.delete(token);
      }
    }
  }

  // === Event System ===

  subscribe(listener: BridgeEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: BridgeEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  // === Cleanup ===

  destroy(): void {
    this.listeners.clear();
    this.contextCache.clear();
    this.latencyHistory = [];
  }
}

// Singleton instance
export const spatialBridge = new SpatialBridgeManager();
