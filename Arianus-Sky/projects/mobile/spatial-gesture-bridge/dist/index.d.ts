export * from './types';
export { GestureHapticBridge, createGestureHapticBridge, type HapticPlatform, type HapticEmitter, iOSHapticEmitter, AndroidHapticEmitter, WebHapticEmitter, MockHapticEmitter, } from './GestureHapticBridge';
export { XRWebSocketClient, createXRWebSocketClient, createManipulationIntent, } from './XRWebSocketClient';
export { SpatialHintRenderer, createSpatialHintRenderer, type RenderCallback, } from './SpatialHintRenderer';
export { GestureRecognizer, PinchRecognizer, DEFAULT_GESTURE_CONFIG, type GestureConfig, type Point2D, type PinchState, } from './GestureRecognizer';
import { XRMessage, PresentationMode, GestureType, ManipulationIntent, SpatialHint } from './types';
export type { XRMessage, PresentationMode, GestureType, ManipulationIntent, SpatialHint };
export declare function createXRModule(wsUrl: string, platform?: 'ios' | 'android' | 'web' | 'mock'): {
    haptics: import("./GestureHapticBridge").GestureHapticBridge;
    ws: import("./XRWebSocketClient").XRWebSocketClient;
    connect: () => Promise<void>;
    disconnect: () => void;
};
