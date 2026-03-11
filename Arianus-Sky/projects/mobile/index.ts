/**
 * Mobile Gesture Capture & Preview
 * Exports for VR gesture integration
 */

export { GestureCapture, type SpatialIntent, type GestureAction, type GestureConfig } from './gesture-capture';
export { SpatialPreviewRenderer, type PreviewConfig } from './spatial-preview';
export { SpatialAPIClient, type AnchorState, type HapticPayload, type GestureEvent, type ConnectionState } from './spatial-api-client';
export { GestureStream, getGestureStream, ConnectionState as StreamConnectionState, type GestureStreamConfig } from './gesture-stream';

// Gesture types & config (Confidence Threshold, Throttle, Session State)
export {
  GESTURE_CONFIG,
  SessionState,
  Handedness,
  getSwipeDirection,
  canEmitGesture,
  ACTION_EFFECT_MAP,
  // Error handling
  XRpcErrorCode,
  type XRpcError,
  // Session management
  type ImmersionContext,
  createImmersionContext,
  updateImmersionContext,
  // Swipe mapping
  type SwipeDirection,
  mapSwipeToAction,
  // Confidence threshold
  AUTO_COMMIT_CONFIDENCE,
  shouldAutoCommit,
  getConfidenceTier,
  // Types
  type XRThermal,
  type XRGestureIntent,
  type CastGesture,
  type ChargeGesture,
  type SwipeVector,
  type Vector3,
  type GestureIntentPayload
} from './gesture-types';

// Configuration (env-configurable endpoints)
export { config } from './config';

// Intent Queue (3-deep FIFO)
export { IntentQueue } from './intent-queue';

// Undo Manager (3s window)
export { UndoManager } from './undo-manager';
