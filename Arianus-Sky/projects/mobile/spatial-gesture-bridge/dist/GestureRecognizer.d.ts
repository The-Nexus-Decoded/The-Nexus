import { GestureEvent } from './types';
import { GestureHapticBridge } from './GestureHapticBridge';
export interface Point2D {
    x: number;
    y: number;
    timestamp: number;
}
export interface GestureConfig {
    confidenceThreshold: number;
    rotationThreshold: number;
    flickVelocityThreshold: number;
    pinchDistanceThreshold: number;
}
export declare const DEFAULT_GESTURE_CONFIG: GestureConfig;
export declare class GestureRecognizer {
    private config;
    private touchStart;
    private touchCurrent;
    private gestureStartTime;
    private isTracking;
    private rotationAccumulator;
    private lastAngle;
    private circleEventCount;
    private haptics;
    constructor(config?: Partial<GestureConfig>);
    setHaptics(bridge: GestureHapticBridge): void;
    onTouchStart(x: number, y: number): void;
    onTouchMove(x: number, y: number): GestureEvent | null;
    onTouchEnd(): GestureEvent | null;
    private calculateRotation;
    private radiansToDegrees;
    private distance;
    private calculateRotationConfidence;
    private calculateLongPressConfidence;
    private calculateFlickConfidence;
    private reset;
    isGestureTracking(): boolean;
}
export interface PinchState {
    isPinching: boolean;
    scale: number;
    center: Point2D;
}
export declare class PinchRecognizer {
    private initialDistance;
    private isPinching;
    private lastScale;
    onTouchStart(touch1: Point2D, touch2: Point2D): void;
    onTouchMove(touch1: Point2D, touch2: Point2D): PinchState | null;
    onTouchEnd(): PinchState | null;
    private distance;
}
