"use strict";
// XR Interface Types v1.0
// Derived from XR-Interface-Spec.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROXIMITY_CONFIG = exports.GAZE_THRESHOLD_DISTANCE = exports.SPATIAL_HINT_MAP = exports.TIMING = exports.RECONCILIATION_CONFIG = exports.INTENT_QUEUE_CONFIG = exports.WORLD_UNIT_BASELINE = exports.VIRTUAL_DISPLAY_V1 = exports.ACK_PATTERNS = exports.MANIPULATION_MATRIX = exports.GESTURE_HAPTIC_MAP = void 0;
exports.GESTURE_HAPTIC_MAP = {
    double_tap: {
        pulses: [35],
        gaps: [],
        intensity: 'medium',
    },
    rotate: {
        pulses: [50, 50],
        gaps: [80],
        intensity: 'high',
    },
    long_press: {
        pulses: [40, 40, 40],
        gaps: [50, 50],
        intensity: 'high',
    },
    mode_toggle: {
        pulses: [50],
        gaps: [],
        intensity: 'medium',
    },
};
exports.MANIPULATION_MATRIX = {
    move: {
        type: 'ghost_wireframe',
        uniform: false,
    },
    rotate: {
        type: 'rotation_ring',
        uniform: true,
    },
    scale: {
        type: 'corner_handles',
        uniform: true,
    },
};
exports.ACK_PATTERNS = {
    1: { tier: 1, pulses: 0, screen_flash: false },
    2: { tier: 2, pulses: 1, screen_flash: false },
    3: { tier: 3, pulses: 2, screen_flash: true },
};
exports.VIRTUAL_DISPLAY_V1 = {
    distance: 1.0,
    width: 0.8,
    aspectRatio: 16 / 9,
};
// ==================== World Unit Math ====================
exports.WORLD_UNIT_BASELINE = {
    referenceDistance: 1.0, // 1m
    fovHorizontal: 90, // degrees
    canvasWidth: 1920,
    pixelsPerWorldUnit: 960,
    touchTargetPixels: 44,
    touchTargetWorldUnits: 44 / 960, // ~0.046m at 1m
};
exports.INTENT_QUEUE_CONFIG = {
    maxDepth: 3,
    previewQueueMax: 3,
    overflowThreshold: 50,
    overflowBehavior: 'drop_oldest',
};
exports.RECONCILIATION_CONFIG = {
    merge: {
        mode: 'merge',
        mergeStrategy: 'combine_queues',
        maxQueueSize: 10,
    },
    queue_flush: {
        mode: 'queue_flush',
        maxQueueSize: 0,
    },
    last_wins: {
        mode: 'last_wins',
        maxQueueSize: 3,
    },
};
// ==================== Timing Constants ====================
exports.TIMING = {
    gestureToHeadsetConfirm: 2000, // ms
    doubleTapInterval: 300, // ms
    longPressThreshold: 500, // ms
    maxRoundTripLatency: 100, // ms
    undoWindow: 3000, // ms
    frameDropRecovery: 2000, // ms
};
exports.SPATIAL_HINT_MAP = {
    '3d_spawn': {
        hint: '3d_spawn',
        renderMobile: true,
        triggerHaptics: true,
    },
    '2d_overlay': {
        hint: '2d_overlay',
        renderMobile: true,
        triggerHaptics: true,
    },
    'haptic_only': {
        hint: 'haptic_only',
        renderMobile: false,
        triggerHaptics: true,
    },
};
exports.GAZE_THRESHOLD_DISTANCE = 1.5; // meters
exports.PROXIMITY_CONFIG = {
    enabled: true,
    useMotionFallback: true,
    wakeThresholdMs: 5000,
};
