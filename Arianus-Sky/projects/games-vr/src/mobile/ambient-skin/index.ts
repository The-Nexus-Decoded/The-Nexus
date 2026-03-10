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

// Re-export commonly used types
export type {
  ImmersionDepth,
  ThermalTier,
  AttentionLease,
  HapticPattern,
  IntentType,
  SpatialHint,
  PreviewItem,
  ConnectionStatus
} from './types';

// Version
export const AMBIENT_SKIN_VERSION = '1.0.0';
