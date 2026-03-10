/**
 * AmbientSkin Types
 * Core type definitions for mobile↔spatial tether
 * 
 * @author Paithan
 * @date 2026-03-09
 */

// === Immersion Depth ===

export type ImmersionDepth = 'Full' | 'Peripheral' | 'Background';

export interface ImmersionState {
  depth: ImmersionDepth;
  lease: AttentionLease | null;
  thermal: ThermalContext;
  timestamp: number;
}

// === Thermal Context ===

export type ThermalTier = 'Nominal' | 'Throttling' | 'Critical';

export interface ThermalState {
  tier: ThermalTier;
  temperatureCelsius: number;
  lastUpdated: number;
}

export interface ThermalThresholds {
  Nominal: number;  // < this = Nominal
  Throttling: number;  // < this = Throttling
  // >= Throttling = Critical
}

// === Attention Lease ===

export interface AttentionLease {
  durationMinutes: number;
  startedAt: number;
  expiresAt: number;
  autoResume: boolean;
  gracefulExit: boolean;
}

export interface LeaseConfig {
  lease_duration_minutes: number;
  auto_resume: boolean;
  graceful_exit: boolean;
}

// === Haptic Vocabulary ===

export type HapticPattern = 'single_pulse' | 'double_pulse' | 'sustained';

export interface HapticEvent {
  pattern: HapticPattern;
  meaning: string;
  eventType: string;
  ackRequired: boolean;
}

// === Event Priority ===

export type Urgency = 'none' | 'normal' | 'high' | 'critical';

export interface EventPriority {
  tier: 'Quiet' | 'Loud(1)' | 'Loud(2)' | 'Critical';
  urgency: Urgency;
  responseWindowMs: number | null;
}

export interface IntentMetadata {
  event_type: 'message' | 'combat' | 'thermal' | 'social';
  urgency: Urgency;
  response_window_ms: number | null;
  user_initiated: boolean;
  action_required: boolean;
}

// === TTL & Priority ===

export type IntentType = 'cast' | 'movement' | 'menu' | 'combat' | 'trade' | 'social';

export interface TTLConfig {
  ttl_ms_tiered: Record<IntentType, number>;
  priority: {
    high: number;
    normal: number;
    low: number;
  };
}

// === Spatial Hint ===

export type SpatialHint = '3d_spawn' | '2d_overlay' | 'haptic_only';

// === Preview Queue ===

export interface PreviewItem {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  ephemeral: boolean;
}

export interface PreviewQueueConfig {
  queue_max: number;
  on_overflow: 'drop_oldest' | 'drop_all';
  ambient_behavior: 'queue' | 'skip' | 'haptic_only';
}

// === State Reconciliation ===

export interface ReconciliationState {
  lastStateHash: string;
  lastAckedIntentId: string | null;
  pendingIntents: PendingIntent[];
  strategy: 'delta_merge';
}

export interface PendingIntent {
  id: string;
  type: IntentType;
  payload: unknown;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected' | 'transformed';
}

export interface ReconciliationResult {
  accepted: string[];
  rejected: { id: string; reason: string }[];
  transformed: { id: string; newPayload: unknown }[];
}

// === Z-Depth Sync ===

export interface ZDepthState {
  position: number;
  lastWriter: 'mobile' | 'vr';
  lastUpdated: number;
}

export interface ZDepthConfig {
  authority: 'last_writer_wins';
  maxDeltaPerSecond: number;
  fallback: 'vr';
}

// === Gesture Types (from existing) ===

export type GestureType = 'tap' | 'double_tap' | 'drag' | 'pinch' | 'rotate' | 'twist' | 'long_press' | 'flick' | 'hold' | 'circle' | 'pinch_sartan';

export interface GestureIntent {
  id: string;
  type: GestureType;
  position: WorldPosition;
  direction: Vector3;
  magnitude: number;
  duration: number;
  timestamp: number;
  context: IntentContext;
  metadata: GestureMetadata;
}

export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface IntentContext {
  sourceTask: string | null;
  selectionIds: string[];
  transitionPoint: string;
  returnToken: string;
}

export interface GestureMetadata {
  sourceDevice: 'mobile' | 'spatial';
  confidence: number;
  sessionId: string;
  originatingSurface: string;
  presentationSkin: 'default' | 'menu';
  gazeConfirm: GazeConfirm;
}

export interface GazeConfirm {
  required: boolean;
  distanceMeters: number;
  confirmed: boolean;
}

// === Optimistic UI ===

export interface OptimisticUIConfig {
  optimistic_ui: boolean;
  rollback_on_timeout: boolean;
}

// === Connection Status ===

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'warning';
