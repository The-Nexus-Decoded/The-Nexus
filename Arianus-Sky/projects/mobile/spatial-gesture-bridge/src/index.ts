// XR Module exports
// Mobile ↔ XR Interface implementation

// Types
export * from './types';

// Core components
export { 
  GestureHapticBridge, 
  createGestureHapticBridge,
  type HapticPlatform,
  type HapticEmitter,
  iOSHapticEmitter,
  AndroidHapticEmitter,
  WebHapticEmitter,
  MockHapticEmitter,
} from './GestureHapticBridge';

export { 
  XRWebSocketClient, 
  createXRWebSocketClient,
  createManipulationIntent,
} from './XRWebSocketClient';

export {
  SpatialHintRenderer,
  createSpatialHintRenderer,
  type RenderCallback,
} from './SpatialHintRenderer';

export {
  GestureRecognizer,
  PinchRecognizer,
  DEFAULT_GESTURE_CONFIG,
  type GestureConfig,
  type Point2D,
  type PinchState,
} from './GestureRecognizer';

// Convenience re-exports
import { XRMessage, PresentationMode, GestureType, ManipulationIntent, SpatialHint } from './types';
export type { XRMessage, PresentationMode, GestureType, ManipulationIntent, SpatialHint };

// Default instance creators - importing factories
import { createGestureHapticBridge } from './GestureHapticBridge';
import { createXRWebSocketClient } from './XRWebSocketClient';

export function createXRModule(wsUrl: string, platform?: 'ios' | 'android' | 'web' | 'mock') {
  const haptics = createGestureHapticBridge(platform);
  const ws = createXRWebSocketClient(wsUrl);
  
  return {
    haptics,
    ws,
    connect: () => ws.connect(),
    disconnect: () => ws.disconnect(),
  };
}
