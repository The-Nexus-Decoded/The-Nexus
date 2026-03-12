// Gestures Module - Mobile → VR Intent Bridge
// Exports GestureBridge and GestureRecognizer

export { 
  GestureBridge, 
  gestureBridge,
  type IGestureBridge,
  type GestureIntent,
  type GestureType,
  type Vector2,
  type SwipeMetadata,
  type HoldMetadata,
  type PinchMetadata,
  type RotateMetadata,
  // XR v1.0 gesture types
  type GrabMetadata,
  type PointMetadata,
  type PalmPushMetadata,
  type TwoHandPinchMetadata,
  type SnapTurnMetadata,
  type AirTapMetadata,
  // VR→Mobile events
  type VRGestureEvent
} from './GestureBridge';

export { GestureRecognizer } from './GestureRecognizer';

// === Convenience Factory ===

import { GestureBridge, GestureRecognizer } from './GestureBridge';
import type { GestureIntent } from './GestureBridge';

export interface GestureBridgeConfig {
  wsUrl: string;
  screenElement: HTMLElement;
  enableXRHandTracking?: boolean; // Enable WebXR hand tracking input
}

export async function initGestureBridge(config: GestureBridgeConfig): Promise<GestureRecognizer> {
  const bridge = new GestureBridge();
  
  // Connect to WebSocket
  await bridge.connect(config.wsUrl);

  // Create recognizer with bridge as intent handler
  const recognizer = new GestureRecognizer((intent: GestureIntent) => {
    bridge.sendIntent(intent);
  });

  // Attach touch listeners
  const screen = config.screenElement;
  
  screen.addEventListener('touchstart', (e) => {
    recognizer.onTouchStart(
      Array.from(e.changedTouches).map(t => ({
        identifier: t.identifier,
        pageX: t.pageX,
        pageY: t.pageY
      }))
    );
  }, { passive: true });

  screen.addEventListener('touchmove', (e) => {
    recognizer.onTouchMove(
      Array.from(e.changedTouches).map(t => ({
        identifier: t.identifier,
        pageX: t.pageX,
        pageY: t.pageY
      }))
    );
  }, { passive: true });

  screen.addEventListener('touchend', (e) => {
    recognizer.onTouchEnd(
      Array.from(e.changedTouches).map(t => ({
        identifier: t.identifier,
        pageX: t.pageX,
        pageY: t.pageY
      }))
    );
  }, { passive: true });

  // Optional: WebXR hand tracking setup
  if (config.enableXRHandTracking) {
    setupXRHandTracking(recognizer);
  }

  return recognizer;
}

// WebXR hand tracking setup helper
function setupXRHandTracking(recognizer: GestureRecognizer): void {
  if (!navigator.xr) return;

  navigator.xr.isHandTrackingSupported().then((supported) => {
    if (!supported) {
      console.warn('[GestureBridge] Hand tracking not supported');
      return;
    }
    // Hand tracking is supported - the app should pass hand data via
    // recognizer.onHandTrackingUpdate() when in XR session
    console.log('[GestureBridge] Hand tracking ready');
  });
}
