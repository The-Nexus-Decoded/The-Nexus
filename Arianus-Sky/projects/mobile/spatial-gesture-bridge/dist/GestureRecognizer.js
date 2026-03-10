"use strict";
// Gesture Recognizer - Sartan-style gestures
// Implements: flick, hold, circle, pinch with confidence scoring
Object.defineProperty(exports, "__esModule", { value: true });
exports.PinchRecognizer = exports.GestureRecognizer = exports.DEFAULT_GESTURE_CONFIG = void 0;
const types_1 = require("./types");
exports.DEFAULT_GESTURE_CONFIG = {
    confidenceThreshold: 0.8,
    rotationThreshold: 15,
    flickVelocityThreshold: 0.5,
    pinchDistanceThreshold: 50,
};
class GestureRecognizer {
    constructor(config = {}) {
        this.touchStart = null;
        this.touchCurrent = null;
        this.gestureStartTime = 0;
        this.isTracking = false;
        this.rotationAccumulator = 0;
        this.lastAngle = null;
        this.circleEventCount = 0;
        this.haptics = null;
        this.config = { ...exports.DEFAULT_GESTURE_CONFIG, ...config };
    }
    setHaptics(bridge) {
        this.haptics = bridge;
    }
    // ==================== Touch Event Handlers ====================
    onTouchStart(x, y) {
        this.touchStart = { x, y, timestamp: Date.now() };
        this.touchCurrent = { x, y, timestamp: Date.now() };
        this.gestureStartTime = Date.now();
        this.isTracking = true;
        this.rotationAccumulator = 0;
        this.lastAngle = null;
        this.circleEventCount = 0;
    }
    onTouchMove(x, y) {
        if (!this.isTracking || !this.touchStart)
            return null;
        const now = Date.now();
        const prev = this.touchCurrent;
        this.touchCurrent = { x, y, timestamp: now };
        // Calculate rotation (circle gesture)
        const rotation = this.calculateRotation(prev, this.touchCurrent);
        if (rotation !== null) {
            this.rotationAccumulator += Math.abs(rotation);
            // Emit rotation event at 15° thresholds
            const degrees = this.radiansToDegrees(this.rotationAccumulator);
            const threshold = this.config.rotationThreshold;
            if (degrees >= this.circleEventCount * threshold + threshold) {
                this.circleEventCount++;
                // Trigger haptic feedback for rotation
                if (this.haptics) {
                    this.haptics.processGesture('rotate', this.config.confidenceThreshold);
                }
                return {
                    type: 'rotate',
                    timestamp: now,
                    confidence: this.calculateRotationConfidence(degrees),
                };
            }
        }
        return null;
    }
    onTouchEnd() {
        if (!this.isTracking || !this.touchStart || !this.touchCurrent) {
            this.reset();
            return null;
        }
        const duration = Date.now() - this.gestureStartTime;
        const { x: sx, y: sy } = this.touchStart;
        const { x: ex, y: ey } = this.touchCurrent;
        const distance = this.distance(sx, sy, ex, ey);
        const velocity = distance / Math.max(duration, 1);
        let gesture = null;
        // Long press detection
        if (duration >= types_1.TIMING.longPressThreshold) {
            gesture = {
                type: 'long_press',
                timestamp: Date.now(),
                confidence: this.calculateLongPressConfidence(duration),
            };
        }
        // Double-tap detection
        else if (distance < 20 && duration < 200) {
            gesture = {
                type: 'double_tap',
                timestamp: Date.now(),
                confidence: 1.0,
            };
        }
        // Flick detection
        else if (velocity >= this.config.flickVelocityThreshold) {
            gesture = {
                type: 'double_tap', // Flick maps to double-tap intent
                timestamp: Date.now(),
                confidence: this.calculateFlickConfidence(velocity),
            };
        }
        this.reset();
        return gesture;
    }
    // ==================== Math Helpers ====================
    calculateRotation(p1, p2) {
        if (!this.lastAngle) {
            this.lastAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            return null;
        }
        const currentAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        let delta = currentAngle - this.lastAngle;
        // Handle angle wrapping
        if (delta > Math.PI)
            delta -= 2 * Math.PI;
        if (delta < -Math.PI)
            delta += 2 * Math.PI;
        this.lastAngle = currentAngle;
        return delta;
    }
    radiansToDegrees(radians) {
        return radians * (180 / Math.PI);
    }
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
    // ==================== Confidence Calculations ====================
    calculateRotationConfidence(degrees) {
        // More rotation = higher confidence
        const minDegrees = this.config.rotationThreshold;
        const confidence = Math.min(degrees / (minDegrees * 3), 1.0);
        return Math.max(confidence, this.config.confidenceThreshold);
    }
    calculateLongPressConfidence(durationMs) {
        // Longer press = higher confidence (up to 2s)
        const minDuration = types_1.TIMING.longPressThreshold;
        const confidence = Math.min(durationMs / 2000, 1.0);
        return Math.max(confidence, this.config.confidenceThreshold);
    }
    calculateFlickConfidence(velocity) {
        // Higher velocity = higher confidence
        const threshold = this.config.flickVelocityThreshold;
        const confidence = Math.min(velocity / (threshold * 3), 1.0);
        return Math.max(confidence, this.config.confidenceThreshold);
    }
    // ==================== State ====================
    reset() {
        this.touchStart = null;
        this.touchCurrent = null;
        this.isTracking = false;
        this.rotationAccumulator = 0;
        this.lastAngle = null;
        this.circleEventCount = 0;
    }
    isGestureTracking() {
        return this.isTracking;
    }
}
exports.GestureRecognizer = GestureRecognizer;
class PinchRecognizer {
    constructor() {
        this.initialDistance = 0;
        this.isPinching = false;
        this.lastScale = 1.0;
    }
    onTouchStart(touch1, touch2) {
        this.initialDistance = this.distance(touch1, touch2);
        this.isPinching = true;
        this.lastScale = 1.0;
    }
    onTouchMove(touch1, touch2) {
        if (!this.isPinching || this.initialDistance === 0)
            return null;
        const currentDistance = this.distance(touch1, touch2);
        const scale = currentDistance / this.initialDistance;
        this.lastScale = scale;
        const center = {
            x: (touch1.x + touch2.x) / 2,
            y: (touch1.y + touch2.y) / 2,
            timestamp: Date.now(),
        };
        return {
            isPinching: this.isPinching,
            scale,
            center,
        };
    }
    onTouchEnd() {
        if (!this.isPinching)
            return null;
        this.isPinching = false;
        const result = {
            isPinching: false,
            scale: this.lastScale,
            center: { x: 0, y: 0, timestamp: Date.now() },
        };
        this.initialDistance = 0;
        this.lastScale = 1.0;
        return result;
    }
    distance(p1, p2) {
        return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    }
}
exports.PinchRecognizer = PinchRecognizer;
