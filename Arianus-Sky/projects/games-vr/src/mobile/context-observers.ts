/**
 * Context Observers - Continuous Gradient State
 * 
 * Monitors:
 * - PresenceContext: User presence state (proximity sensor, face detection)
 * - ThermalState: Device thermal state (battery temp, CPU temp)
 * - AttentionLease: User attention/engagement level
 * 
 * All three signals produce continuous morphing gradients, not discrete modes.
 * Combined: PresenceContext × ThermalState × AttentionLease = gradient
 * 
 * @author Paithan
 * @date 2026-03-09
 */

import { hapticEngine, FeedbackState } from './hapticEngine';

// ============================================================================
// TYPES
// ============================================================================

/**
 * PresenceContext: Continuous presence level (0.0 - 1.0)
 * 0.0 = not present / device held by someone else
 * 1.0 = fully present / user actively holding device
 */
export type PresenceLevel = number; // 0.0-1.0 continuous

/**
 * ThermalState: Continuous thermal level (0.0 - 1.0)
 * 0.0 = cool / idle
 * 1.0 = critical thermal throttling
 */
export type ThermalLevel = number; // 0.0-1.0 continuous

/**
 * AttentionLease: Continuous attention level (0.0 - 1.0)
 * 0.0 = no attention / app backgrounded / user looking away
 * 1.0 = full attention / active engagement
 */
export type AttentionLevel = number; // 0.0-1.0 continuous

/**
 * Combined gradient value (0.0 - 1.0)
 * Computed as: PresenceContext × ThermalState × AttentionLease
 */
export type GradientValue = number;

/**
 * Observer callback for gradient changes
 */
export type GradientCallback = (gradient: GradientValue) => void;

// ============================================================================
// PRESENCE CONTEXT OBSERVER
// ============================================================================

export class PresenceObserver {
  private level: PresenceLevel = 0;
  private listeners: Set<(level: PresenceLevel) => void> = new Set();
  private proximitySensor: ProximitySensor | null = null;
  private faceDetector: FaceDetector | null = null;
  private pollingInterval: number | null = null;

  constructor() {
    this.initSensors();
  }

  private initSensors(): void {
    // Try to initialize proximity sensor
    if ('ProximitySensor' in window) {
      try {
        this.proximitySensor = new (window as any).ProximitySensor();
        this.proximitySensor.addEventListener('change', (e: any) => {
          this.updateLevel(e.near ? 1.0 : 0.0);
        });
      } catch (e) {
        console.warn('[PresenceObserver] Proximity sensor unavailable');
      }
    }

    // Try to initialize face detector (if available)
    if ('FaceDetector' in window) {
      try {
        this.faceDetector = new (window as any).FaceDetector();
      } catch (e) {
        console.warn('[PresenceObserver] FaceDetector unavailable');
      }
    }

    // Fallback: polling-based presence detection
    if (!this.proximitySensor) {
      this.startPolling();
    }
  }

  private startPolling(): void {
    this.pollingInterval = window.setInterval(() => {
      // Simple heuristics: check if page is visible and user is interacting
      const visible = document.visibilityState === 'visible';
      const now = Date.now();
      const recentInteraction = now - lastInteractionTime < 5000;
      
      // Gradual presence based on interaction recency
      if (!visible) {
        this.updateLevel(0);
      } else if (recentInteraction) {
        this.updateLevel(1.0);
      } else {
        // Decay over 30 seconds
        const decay = Math.max(0, 1 - (now - lastInteractionTime) / 30000);
        this.updateLevel(decay);
      }
    }, 1000);
  }

  private updateLevel(newLevel: PresenceLevel): void {
    if (Math.abs(newLevel - this.level) > 0.01) {
      this.level = Math.max(0, Math.min(1, newLevel));
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => cb(this.level));
  }

  /**
   * Subscribe to presence changes
   */
  subscribe(callback: (level: PresenceLevel) => void): () => void {
    this.listeners.add(callback);
    callback(this.level); // Immediate callback with current state
    return () => this.listeners.delete(callback);
  }

  /**
   * Get current presence level
   */
  getLevel(): PresenceLevel {
    return this.level;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    this.listeners.clear();
  }
}

// Track last interaction for fallback presence detection
let lastInteractionTime = Date.now();
if (typeof document !== 'undefined') {
  document.addEventListener('touchstart', () => lastInteractionTime = Date.now());
  document.addEventListener('mousedown', () => lastInteractionTime = Date.now());
  document.addEventListener('keydown', () => lastInteractionTime = Date.now());
  document.addEventListener('scroll', () => lastInteractionTime = Date.now());
}

// ============================================================================
// THERMAL STATE OBSERVER
// ============================================================================

export class ThermalObserver {
  private level: ThermalLevel = 0;
  private listeners: Set<(level: ThermalLevel) => void> = new Set();
  private batteryManager: any = null;
  private pollingInterval: number | null = null;

  constructor() {
    this.initThermalMonitoring();
  }

  private async initThermalMonitoring(): Promise<void> {
    // Try Battery Manager API
    if ('getBattery' in navigator) {
      try {
        this.batteryManager = await (navigator as any).getBattery();
        this.batteryManager.addEventListener('levelchange', () => this.updateFromBattery());
        this.batteryManager.addEventListener('chargingchange', () => this.updateFromBattery());
        this.updateFromBattery();
      } catch (e) {
        console.warn('[ThermalObserver] Battery API unavailable');
      }
    }

    // Polling fallback - estimate from CPU/performance
    this.startPolling();
  }

  private updateFromBattery(): void {
    if (!this.batteryManager) return;
    
    // Combine battery level and charging state
    const batteryLevel = this.batteryManager.level; // 0-1
    const charging = this.batteryManager.charging;
    
    // Thermal approximation: low battery = warmer (more CPU strain)
    // Charging = actively generating heat
    let thermal = 1 - batteryLevel;
    if (charging) thermal += 0.2;
    
    this.updateLevel(Math.min(1, thermal));
  }

  private startPolling(): void {
    this.pollingInterval = window.setInterval(() => {
      // Adaptive polling based on recent thermal activity
      const now = Date.now();
      
      // Estimate thermal from performance hints
      let estimatedThermal = 0.3; // Base idle thermal
      
      // If battery manager exists, use it
      if (this.batteryManager) {
        this.updateFromBattery();
      } else {
        // Fallback: use idle thermal
        this.updateLevel(estimatedThermal);
      }
    }, 5000);
  }

  private updateLevel(newLevel: ThermalLevel): void {
    if (Math.abs(newLevel - this.level) > 0.05) {
      this.level = Math.max(0, Math.min(1, newLevel));
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => cb(this.level));
  }

  /**
   * Subscribe to thermal changes
   */
  subscribe(callback: (level: ThermalLevel) => void): () => void {
    this.listeners.add(callback);
    callback(this.level);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get current thermal level
   */
  getLevel(): ThermalLevel {
    return this.level;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    this.listeners.clear();
  }
}

// ============================================================================
// ATTENTION LEASE OBSERVER
// ============================================================================

export class AttentionObserver {
  private level: AttentionLevel = 0;
  private listeners: Set<(level: AttentionLevel) => void> = new Set();
  private visibilityHandler: (() => void) | null = null;
  private focusHandler: (() => void) | null = null;
  private pollingInterval: number | null = null;
  private attentionScore: number = 0;

  constructor() {
    this.initAttentionMonitoring();
  }

  private initAttentionMonitoring(): void {
    if (typeof document === 'undefined') return;

    // Visibility-based attention
    this.visibilityHandler = () => {
      if (document.hidden) {
        this.updateLevel(0);
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    // Focus-based attention
    this.focusHandler = () => {
      if (document.hasFocus()) {
        this.updateLevel(1.0);
      } else {
        this.updateLevel(0);
      }
    };
    window.addEventListener('focus', this.focusHandler);
    window.addEventListener('blur', this.focusHandler);

    // Start attention scoring
    this.startAttentionScoring();
  }

  private startAttentionScoring(): void {
    this.pollingInterval = window.setInterval(() => {
      let score = 0;

      // Page visibility (heavy weight)
      if (!document.hidden) score += 0.4;

      // Focus state
      if (document.hasFocus()) score += 0.3;

      // Recent interaction
      if (Date.now() - lastInteractionTime < 10000) score += 0.3;

      // Smooth transition
      this.attentionScore = this.attentionScore * 0.7 + score * 0.3;
      this.updateLevel(this.attentionScore);
    }, 500);
  }

  private updateLevel(newLevel: AttentionLevel): void {
    if (Math.abs(newLevel - this.level) > 0.05) {
      this.level = Math.max(0, Math.min(1, newLevel));
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => cb(this.level));
  }

  /**
   * Subscribe to attention changes
   */
  subscribe(callback: (level: AttentionLevel) => void): () => void {
    this.listeners.add(callback);
    callback(this.level);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get current attention level
   */
  getLevel(): AttentionLevel {
    return this.level;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    if (this.focusHandler) {
      window.removeEventListener('focus', this.focusHandler);
      window.removeEventListener('blur', this.focusHandler);
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    this.listeners.clear();
  }
}

// ============================================================================
// GRADIENT COMPUTATION (PresenceContext × ThermalState × AttentionLease)
// ============================================================================

export class GradientObserver {
  private presence: PresenceObserver;
  private thermal: ThermalObserver;
  private attention: AttentionObserver;
  
  private gradient: GradientValue = 0;
  private listeners: Set<GradientCallback> = new Set();
  private updateBound: () => void;

  constructor() {
    this.presence = new PresenceObserver();
    this.thermal = new ThermalObserver();
    this.attention = new AttentionObserver();

    this.updateBound = this.update.bind(this);
    
    // Subscribe to all three and recompute gradient on any change
    this.presence.subscribe(this.updateBound);
    this.thermal.subscribe(this.updateBound);
    this.attention.subscribe(this.updateBound);
  }

  private update(): void {
    // Compute: PresenceContext × ThermalState × AttentionLease
    const p = this.presence.getLevel();
    const t = this.thermal.getLevel();
    const a = this.attention.getLevel();
    
    const newGradient = p * t * a;
    
    if (Math.abs(newGradient - this.gradient) > 0.01) {
      this.gradient = newGradient;
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => cb(this.gradient));
  }

  /**
   * Subscribe to gradient changes
   * Returns gradient value 0.0-1.0 (continuous)
   */
  subscribe(callback: GradientCallback): () => void {
    this.listeners.add(callback);
    callback(this.gradient); // Immediate callback
    return () => this.listeners.delete(callback);
  }

  /**
   * Get current combined gradient
   */
  getGradient(): GradientValue {
    return this.gradient;
  }

  /**
   * Get individual components (for debugging/display)
   */
  getComponents(): {
    presence: PresenceLevel;
    thermal: ThermalLevel;
    attention: AttentionLevel;
  } {
    return {
      presence: this.presence.getLevel(),
      thermal: this.thermal.getLevel(),
      attention: this.attention.getLevel()
    };
  }

  /**
   * Cleanup all observers
   */
  destroy(): void {
    this.presence.destroy();
    this.thermal.destroy();
    this.attention.destroy();
    this.listeners.clear();
  }
}

// ============================================================================
// ACK TIMEOUT MANAGER (150ms timeout with returnToken correlation)
// ============================================================================

export interface PendingIntent {
  token: string;
  timestamp: number;
  onAck: () => void;
  onTimeout: () => void;
}

export class AckTimeoutManager {
  private pending: Map<string, PendingIntent> = new Map();
  private timeout: number = 150; // 150ms per spec
  private cleanupInterval: number | null = null;

  constructor(timeoutMs: number = 150) {
    this.timeout = timeoutMs;
    this.startCleanup();
  }

  /**
   * Register a pending intent with returnToken
   */
  register(token: string, onAck: () => void, onTimeout: () => void): void {
    // Clear any existing with same token
    if (this.pending.has(token)) {
      clearTimeout(this.pending.get(token)!.timestamp as any);
    }

    const entry: PendingIntent = {
      token,
      timestamp: Date.now(),
      onAck,
      onTimeout
    };

    this.pending.set(token, entry);

    // Set timeout
    const timerId = window.setTimeout(() => {
      this.handleTimeout(token);
    }, this.timeout);

    // Store timer ID (TypeScript workaround)
    (entry as any).timerId = timerId;
  }

  /**
   * Acknowledge intent (called when returnToken received)
   */
  ack(token: string): void {
    const entry = this.pending.get(token);
    if (entry) {
      clearTimeout((entry as any).timerId);
      entry.onAck();
      this.pending.delete(token);
    }
  }

  private handleTimeout(token: string): void {
    const entry = this.pending.get(token);
    if (entry) {
      entry.onTimeout();
      this.pending.delete(token);
    }
  }

  private startCleanup(): void {
    // Periodic cleanup of stuck entries
    this.cleanupInterval = window.setInterval(() => {
      const now = Date.now();
      this.pending.forEach((entry, token) => {
        if (now - entry.timestamp > this.timeout * 2) {
          this.handleTimeout(token);
        }
      });
    }, 1000);
  }

  /**
   * Get pending count (for debugging)
   */
  getPendingCount(): number {
    return this.pending.size;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.pending.forEach((entry) => {
      clearTimeout((entry as any).timerId);
    });
    this.pending.clear();
  }
}

// ============================================================================
// EVENT PRIORITY QUEUE (TTL per type per spec lines 75-82)
// ============================================================================

export type IntentType = 'cast' | 'movement' | 'menu' | 'combat' | 'trade' | 'social';
export type PriorityTier = 'high' | 'normal' | 'low';
export type UrgencyLevel = 'none' | 'normal' | 'high' | 'critical';

export interface Intent {
  id: string;
  type: IntentType;
  action: string;
  target?: string;
  payload?: Record<string, unknown>;
  timestamp: number;
  priority: PriorityTier;
  ttl: number; // ms
  confidence: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'timeout';
}

interface QueuedIntent extends Intent {
  expiresAt: number;
}

/**
 * TTL & Priority config per spec
 */
const TTL_CONFIG: Record<IntentType, number> = {
  cast: 5000,
  movement: 500,
  menu: 10000,
  combat: 2000,
  trade: 15000,
  social: 5000
};

const PRIORITY_THRESHOLDS: Record<PriorityTier, number> = {
  high: 2000,
  normal: 5000,
  low: 15000
};

export class EventPriorityQueue {
  private queue: QueuedIntent[] = [];
  private maxSize: number = 50;
  private cleanupInterval: number | null = null;

  constructor() {
    this.startCleanup();
  }

  /**
   * Enqueue an intent with TTL based on type
   */
  enqueue(intent: Omit<Intent, 'timestamp' | 'ttl' | 'status'>): string {
    const id = intent.id || crypto.randomUUID();
    const ttl = TTL_CONFIG[intent.type] || 5000;
    
    const queued: QueuedIntent = {
      ...intent,
      id,
      timestamp: Date.now(),
      ttl,
      expiresAt: Date.now() + ttl,
      status: 'pending'
    };

    // Overflow: drop oldest
    if (this.queue.length >= this.maxSize) {
      const oldest = this.queue.shift();
      console.warn(`[EventPriorityQueue] Overflow - dropped oldest: ${oldest?.id}`);
    }

    // Insert by priority (high first)
    const priorityIndex = this.queue.findIndex(i => 
      PRIORITY_THRESHOLDS[i.priority] > PRIORITY_THRESHOLDS[queued.priority]
    );
    
    if (priorityIndex === -1) {
      this.queue.push(queued);
    } else {
      this.queue.splice(priorityIndex, 0, queued);
    }

    return id;
  }

  /**
   * Mark intent as confirmed (received VR ack)
   */
  confirm(id: string): void {
    const intent = this.queue.find(i => i.id === id);
    if (intent) {
      intent.status = 'confirmed';
    }
  }

  /**
   * Mark intent as rejected
   */
  reject(id: string, reason?: string): void {
    const intent = this.queue.find(i => i.id === id);
    if (intent) {
      intent.status = 'rejected';
      console.log(`[EventPriorityQueue] Intent ${id} rejected: ${reason}`);
    }
  }

  /**
   * Get pending intents (for reconciliation)
   */
  getPending(): Intent[] {
    return this.queue.filter(i => i.status === 'pending');
  }

  /**
   * Get all intents
   */
  getAll(): Intent[] {
    return [...this.queue];
  }

  /**
   * Get count
   */
  size(): number {
    return this.queue.length;
  }

  private startCleanup(): void {
    this.cleanupInterval = window.setInterval(() => {
      const now = Date.now();
      const expired = this.queue.filter(i => i.expiresAt < now);
      
      expired.forEach(i => {
        i.status = 'timeout';
        console.log(`[EventPriorityQueue] Intent ${i.id} timed out`);
      });
      
      // Remove expired
      this.queue = this.queue.filter(i => i.expiresAt > now);
    }, 1000);
  }

  destroy(): void {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.queue = [];
  }
}

// ============================================================================
// PREVIEW QUEUE (max 3, FIFO, ephemeral)
// ============================================================================

export interface Preview {
  id: string;
  content: unknown;
  timestamp: number;
  type: string;
}

export class PreviewQueue {
  private queue: Preview[] = [];
  private maxSize: number = 3;
  private listeners: Set<(previews: Preview[]) => void> = new Set();

  /**
   * Add preview (drops oldest if full)
   */
  add(content: unknown, type: string = 'generic'): string {
    const id = crypto.randomUUID();
    const preview: Preview = {
      id,
      content,
      type,
      timestamp: Date.now()
    };

    if (this.queue.length >= this.maxSize) {
      this.queue.shift(); // Drop oldest
    }

    this.queue.push(preview);
    this.notify();
    return id;
  }

  /**
   * Remove preview by id
   */
  remove(id: string): void {
    this.queue = this.queue.filter(p => p.id !== id);
    this.notify();
  }

  /**
   * Clear all previews (on app background or session end)
   */
  clear(): void {
    this.queue = [];
    this.notify();
  }

  /**
   * Get all previews
   */
  getAll(): Preview[] {
    return [...this.queue];
  }

  subscribe(callback: (previews: Preview[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.queue);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach(cb => cb(this.queue));
  }
}

// ============================================================================
// STATE RECONCILIATION (delta_merge protocol)
// ============================================================================

export interface ReconciliationState {
  lastStateHash: string;
  lastAckedIntentId: string;
}

export type ReconciliationAction = 'accept' | 'reject' | 'transform';

export interface ReconciliationResult {
  action: ReconciliationAction;
  intentId: string;
  explanation?: string;
  transformedPayload?: Record<string, unknown>;
}

/**
 * Delta Merge Protocol per spec:
 * 1. VR sends last_state_hash + last_acked_intent_id
 * 2. Mobile compares with local queue
 * 3. Mobile replays unacked as pending_reconciliation
 * 4. VR validates against current world state
 * 5. VR responds with accept | reject | transform
 * 6. Mobile updates UI to match accepted state
 */
export class StateReconciliation {
  private localStateHash: string = '';
  private lastAckedId: string = '';
  private eventQueue: EventPriorityQueue;

  constructor(eventQueue: EventPriorityQueue) {
    this.eventQueue = eventQueue;
  }

  /**
   * Generate local state hash (simplified - in production use proper hash)
   */
  private generateHash(): string {
    const pending = this.eventQueue.getPending();
    return btoa(`${Date.now()}:${pending.length}:${JSON.stringify(pending.map(p => p.id))}`).slice(0, 16);
  }

  /**
   * Step 1-3: Prepare delta for VR
   */
  prepareDelta(): ReconciliationState {
    this.localStateHash = this.generateHash();
    const pending = this.eventQueue.getPending();
    this.lastAckedId = pending.length > 0 ? pending[pending.length - 1].id : this.lastAckedId;
    
    return {
      lastStateHash: this.localStateHash,
      lastAckedIntentId: this.lastAckedId
    };
  }

  /**
   * Step 6: Process VR response
   */
  processVRResponse(results: ReconciliationResult[]): void {
    results.forEach(result => {
      switch (result.action) {
        case 'accept':
          this.eventQueue.confirm(result.intentId);
          break;
        case 'reject':
          this.eventQueue.reject(result.intentId, result.explanation);
          break;
        case 'transform':
          // Apply transformation and re-queue
          console.log(`[StateReconciliation] Transform intent ${result.intentId}:`, result.transformedPayload);
          this.eventQueue.confirm(result.intentId); // Mark as confirmed with new payload
          break;
      }
    });
  }

  /**
   * Handle explicit reconnect
   */
  onReconnect(): ReconciliationState {
    return this.prepareDelta();
  }

  /**
   * Handle heartbeat timeout (30s)
   */
  onHeartbeatTimeout(): ReconciliationState {
    return this.prepareDelta();
  }
}

// ============================================================================
// Z-DEPTH SYNC (last_writer_wins, max 0.5m/s)
// ============================================================================
// Z-DEPTH SYNC (ARKit convention: Z+ = toward user, world meters)
// ============================================================================

export class ZDepthSync {
  private currentZ: number = 0; // Default at device (Z+ = toward user per ARKit)
  private lastUpdateTime: number = 0;
  private maxDeltaPerSecond: number = 0.5;
  private authority: 'mobile' | 'vr' = 'vr';
  private listeners: Set<(z: number) => void> = new Set();

  /**
   * ARKit coordinate convention:
   * - Origin: device/session start
   * - Z+ = toward user (standard ARKit)
   * - Y+ = up, X+ = right
   * Units: world meters

  /**
   * Update Z from mobile gesture
   * Returns: true if committed, false if queued for VR confirmation
   */
  mobileWrite(newZ: number, confidence: number): boolean {
    if (confidence >= 0.85) {
      return this.applyZUpdate(newZ, 'mobile');
    } else {
      // Queue for VR confirmation
      console.log(`[ZDepthSync] Low confidence (${confidence}) - queuing for VR confirmation`);
      return false;
    }
  }

  /**
   * Update Z from VR
   */
  vrWrite(newZ: number): void {
    this.applyZUpdate(newZ, 'vr');
  }

  private applyZUpdate(newZ: number, source: 'mobile' | 'vr'): boolean {
    const now = Date.now();
    const dt = (now - this.lastUpdateTime) / 1000;
    
    // Rate limit
    const maxDelta = this.maxDeltaPerSecond * (dt || 0.016); // Default ~60fps
    const delta = Math.abs(newZ - this.currentZ);
    
    if (delta > maxDelta && source === 'mobile' && this.authority === 'vr') {
      // Clamp to rate limit
      const direction = newZ > this.currentZ ? 1 : -1;
      this.currentZ += direction * maxDelta;
      console.log(`[ZDepthSync] Rate limited: ${delta}m -> ${maxDelta}m`);
    } else {
      this.currentZ = newZ;
    }

    this.lastUpdateTime = now;
    this.authority = source;
    this.notify();
    
    return true;
  }

  /**
   * Get current Z depth
   */
  getZ(): number {
    return this.currentZ;
  }

  /**
   * Get authority
   */
  getAuthority(): 'mobile' | 'vr' {
    return this.authority;
  }

  subscribe(callback: (z: number) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentZ);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach(cb => cb(this.currentZ));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const presenceObserver = new PresenceObserver();
export const thermalObserver = new ThermalObserver();
export const attentionObserver = new AttentionObserver();
export const gradientObserver = new GradientObserver();
export const ackTimeoutManager = new AckTimeoutManager();
export const eventPriorityQueue = new EventPriorityQueue();
export const previewQueue = new PreviewQueue();
export const stateReconciliation = new StateReconciliation(eventPriorityQueue);
export const zDepthSync = new ZDepthSync();

export type { PresenceLevel, ThermalLevel, AttentionLevel, GradientValue };
