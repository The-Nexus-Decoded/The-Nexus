/**
 * AmbientSkin - Mobile↔Spatial tether implementation
 * 
 * Core modules:
 * - ImmersionContext: Depth state management
 * - ThermalMonitor: Device temperature monitoring  
 * - AttentionLease: Immersion time management
 * - AmbientHaptics: Bi-directional haptic vocabulary
 * - EventPriority: Urgency classification
 * - IntentTTL: Time-to-live by intent type
 * - PreviewQueue: Ephemeral preview cards
 * - StateReconciliation: Delta merge protocol
 * - ZDepthSync: Z-axis synchronization
 * - GestureThrottle: 10Hz intent throttling
 * - IntentResolver: Bidirectional VR↔mobile confirm flow
 * - IntentQueue: 3-deep FIFO with sustained session cap
 * - UndoManager: 3-second temporal window
 * 
 * @author Paithan
 * @date 2026-03-09
 */

// Types
export * from './types';

// Core modules
export { ImmersionContext, immersionContext } from './ImmersionContext';
export { ThermalMonitor, thermalMonitor } from './ThermalMonitor';
export { AttentionLeaseManager, attentionLease } from './AttentionLease';
export { AmbientHaptics, ambientHaptics } from './AmbientHaptics';
export { EventPrioritySystem, PRIORITY_TIERS, TIER_OUTPUTS } from './EventPriority';
export { IntentTTLManager, intentTTL, INTENT_TYPES } from './IntentTTL';
export { PreviewQueue, previewQueue } from './PreviewQueue';
export { StateReconciliation, stateReconciliation } from './StateReconciliation';
export { ZDepthSync, zDepthSync } from './ZDepthSync';

// XRPC Pipeline (per XRPC-SPEC.md)
export { GestureThrottle } from './GestureThrottle';
export { IntentResolver } from './IntentResolver';
export { IntentQueue } from './IntentQueue';
export { UndoManager } from './UndoManager';

// Re-export commonly used types
export type {
  ImmersionDepth,
  ThermalTier,
  AttentionLease,
  HapticPattern,
  IntentType,
  SpatialHint,
  PreviewItem,
  ConnectionStatus,
  XRpcError,
  XRpcErrorCode,
  CacheContext,
  CacheTTLConfig,
  UndoableAction,
  QueuedIntent,
  IntentResolution,
  SpatialIntent,
  GestureType
} from './types';

// Re-export constants
export {
  LATENCY_BUDGET_MS,
  RESOLVE_TIMEOUT_MS,
  ROUNDTRIP_TIMEOUT_MS,
  ACTIONABLE_THRESHOLD_MS,
  UNDO_WINDOW_MS,
  MAX_QUEUE_DEPTH,
  MAX_RETRIES
} from './types';

// Version
export const AMBIENT_SKIN_VERSION = '1.1.0';
