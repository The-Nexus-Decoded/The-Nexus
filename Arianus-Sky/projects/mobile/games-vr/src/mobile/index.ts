/**
 * Spatial Gesture Bridge - Mobile to XR
 * Main export
 * 
 * @author Paithan
 * @date 2026-03-09
 */

// Core gesture processing
export { GestureRecognizer, SpatialProjector, IntentEmitter } from './spatial-gesture-bridge';

// Visual design tokens (Orla's Visual Language Spec)
export { Palette, Typography, Animation, Spacing, BorderRadius } from './designTokens';

// Haptic feedback engine
export { HapticEngine, hapticEngine } from './hapticEngine';
export type { HapticPattern, HapticConfig } from './hapticEngine';

// Visual affordance renderer
export { VisualAffordanceRenderer } from './visualAffordanceRenderer';
export type { AffordanceConfig } from './visualAffordanceRenderer';

// Audio spatializer (spatial audio panning)
export { AudioSpatializer, audioSpatializer } from './audioSpatializer';
export type { AudioSpatializerConfig, AudioCue } from './audioSpatializer';

// Types
export type { 
  SpatialIntent, 
  IntentAction, 
  Vector3, 
  ScreenPoint, 
  GestureState,
  Gesture,
  GestureType 
} from './types';
