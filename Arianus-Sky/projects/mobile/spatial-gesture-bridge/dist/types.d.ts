export type PresentationMode = 'full' | 'ambient' | 'silent';
export type GestureType = 'double_tap' | 'rotate' | 'long_press' | 'mode_toggle';
export type IntentAction = 'move' | 'rotate' | 'scale';
export type PreviewType = 'ghost_wireframe' | 'rotation_ring' | 'corner_handles';
export type TrustTier = 1 | 2 | 3;
export type ErrorCode = 'object_not_found' | 'out_of_bounds' | 'confidence_too_low' | 'timeout' | 'invalid_transition';
export interface GestureEvent {
    type: GestureType;
    timestamp: number;
    confidence: number;
}
export interface HapticPattern {
    pulses: number[];
    gaps: number[];
    intensity: 'low' | 'medium' | 'high';
}
export declare const GESTURE_HAPTIC_MAP: Record<GestureType, HapticPattern>;
export interface ManipulationIntent {
    intentId: string;
    intent: 'manipulate';
    action: IntentAction;
    axis: 'x' | 'y';
    method: 'dual_trigger' | 'dual_grip';
    preview: {
        type: PreviewType;
        uniform: boolean;
    };
    confidence: number;
    user_can_override: boolean;
}
export interface ManipulationPreview {
    type: PreviewType;
    position?: {
        x: number;
        y: number;
    };
    rotation?: number;
    scale?: number;
}
export declare const MANIPULATION_MATRIX: Record<IntentAction, ManipulationIntent['preview']>;
export interface XRStateMessage {
    type: 'state';
    state: PresentationMode;
    timestamp: number;
    ttl_ms?: number;
}
export interface XRIntentMessage {
    type: 'intent';
    intent: ManipulationIntent;
    source: 'menu';
}
export interface XRResponseMessage {
    type: 'response';
    intentId: string;
    status: 'confirmed' | 'rejected';
    error?: {
        code: ErrorCode;
        message: string;
    };
}
export interface XRGestureMessage {
    type: 'gesture';
    gesture: GestureEvent;
    haptics_applied: boolean;
}
export type XRMessage = XRStateMessage | XRIntentMessage | XRResponseMessage | XRGestureMessage;
export interface AckPattern {
    tier: TrustTier;
    pulses: number;
    screen_flash: boolean;
}
export declare const ACK_PATTERNS: Record<TrustTier, AckPattern>;
export interface ThermalState {
    temperature: number;
    tier: TrustTier;
    throttled: boolean;
}
export interface VirtualDisplayConfig {
    distance: number;
    width: number;
    aspectRatio: number;
}
export declare const VIRTUAL_DISPLAY_V1: VirtualDisplayConfig;
export declare const WORLD_UNIT_BASELINE: {
    referenceDistance: number;
    fovHorizontal: number;
    canvasWidth: number;
    pixelsPerWorldUnit: number;
    touchTargetPixels: number;
    touchTargetWorldUnits: number;
};
export interface XRErrorResponse {
    intentId: string;
    status: 'rejected';
    error: {
        code: ErrorCode;
        message: string;
    };
}
export interface IntentQueueConfig {
    maxDepth: number;
    previewQueueMax: number;
    overflowThreshold: number;
    overflowBehavior: 'drop_oldest' | 'reject_new';
}
export declare const INTENT_QUEUE_CONFIG: IntentQueueConfig;
export type ReconciliationMode = 'merge' | 'queue_flush' | 'last_wins';
export interface ReconciliationConfig {
    mode: ReconciliationMode;
    mergeStrategy?: 'combine_queues' | 'prioritize_higher_tier';
    maxQueueSize: number;
}
export declare const RECONCILIATION_CONFIG: Record<ReconciliationMode, ReconciliationConfig>;
export declare const TIMING: {
    gestureToHeadsetConfirm: number;
    doubleTapInterval: number;
    longPressThreshold: number;
    maxRoundTripLatency: number;
    undoWindow: number;
    frameDropRecovery: number;
};
export type SpatialHint = '3d_spawn' | '2d_overlay' | 'haptic_only';
export interface SpatialHintConfig {
    hint: SpatialHint;
    renderMobile: boolean;
    triggerHaptics: boolean;
}
export declare const SPATIAL_HINT_MAP: Record<SpatialHint, SpatialHintConfig>;
export type ChargeState = 'start' | 'stop';
export interface ChargeEvent {
    state: ChargeState;
    timestamp: number;
    intensity?: number;
}
export interface GazeConfirmation {
    required: boolean;
    distance: number;
    confirmed: boolean;
    gazeDuration: number;
}
export declare const GAZE_THRESHOLD_DISTANCE = 1.5;
export interface HUDAngleOffset {
    offsetDegrees: number;
    calibrated: boolean;
    calibrationTimestamp?: number;
}
export interface FrameDropState {
    isReverting: boolean;
    lastValidFrame: number;
    revertProgress: number;
}
export interface ProximityConfig {
    enabled: boolean;
    useMotionFallback: boolean;
    wakeThresholdMs: number;
}
export declare const PROXIMITY_CONFIG: ProximityConfig;
export interface RotationEvent {
    deltaDegrees: number;
    threshold: number;
    eventNumber: number;
    timestamp: number;
}
