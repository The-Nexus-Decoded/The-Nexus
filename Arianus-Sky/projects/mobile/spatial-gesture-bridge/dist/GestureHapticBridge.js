"use strict";
// Gesture-Haptic Bridge
// Maps gestures to platform-specific haptic feedback
Object.defineProperty(exports, "__esModule", { value: true });
exports.GestureHapticBridge = exports.MockHapticEmitter = exports.WebHapticEmitter = exports.AndroidHapticEmitter = exports.iOSHapticEmitter = void 0;
exports.createGestureHapticBridge = createGestureHapticBridge;
const types_1 = require("./types");
// ==================== Platform Implementations ====================
// iOS UIKit Feedback Generator
class iOSHapticEmitter {
    constructor() {
        this.impactLight = null;
        this.impactMedium = null;
        this.impactHeavy = null;
        this.notification = null;
        // Dynamically loaded - see iOS native module
    }
    async playPattern(pattern) {
        // iOS native module will implement:
        // UIImpactFeedbackGenerator / UINotificationFeedbackGenerator
        console.log('[iOS Haptics]', pattern);
    }
}
exports.iOSHapticEmitter = iOSHapticEmitter;
// Android VibrationEffect
class AndroidHapticEmitter {
    constructor() {
        this.vibrator = null;
        // Dynamically loaded - see Android native module  
    }
    async playPattern(pattern) {
        // Android native module will implement:
        // VibrationEffect.createWaveform()
        console.log('[Android Haptics]', pattern);
    }
}
exports.AndroidHapticEmitter = AndroidHapticEmitter;
// Web Vibration API fallback
class WebHapticEmitter {
    async playPattern(pattern) {
        if (!navigator.vibrate) {
            console.warn('[Web Haptics] Vibration API not supported');
            return;
        }
        const timings = [];
        pattern.pulses.forEach((pulse, i) => {
            timings.push(pulse);
            if (i < pattern.gaps.length) {
                timings.push(pattern.gaps[i]);
            }
        });
        navigator.vibrate(timings);
    }
}
exports.WebHapticEmitter = WebHapticEmitter;
// Mock for testing
class MockHapticEmitter {
    constructor() {
        this.logs = [];
    }
    async playPattern(pattern) {
        this.logs.push(pattern);
        console.log('[Mock Haptics]', pattern);
    }
    getLogs() {
        return [...this.logs];
    }
    clear() {
        this.logs = [];
    }
}
exports.MockHapticEmitter = MockHapticEmitter;
// ==================== Gesture-Haptic Bridge ====================
class GestureHapticBridge {
    constructor(platform) {
        this.lastTapTime = 0;
        this.tapCount = 0;
        this.platform = platform;
        this.emitter = this.createEmitter(platform);
    }
    createEmitter(platform) {
        switch (platform) {
            case 'ios':
                return new iOSHapticEmitter();
            case 'android':
                return new AndroidHapticEmitter();
            case 'web':
                return new WebHapticEmitter();
            case 'mock':
            default:
                return new MockHapticEmitter();
        }
    }
    /**
     * Process a gesture event and trigger appropriate haptics
     */
    async processGesture(gesture, confidence) {
        const event = {
            type: gesture,
            timestamp: Date.now(),
            confidence,
        };
        // Only trigger haptics if confidence meets threshold
        if (confidence >= 0.8) {
            const pattern = types_1.GESTURE_HAPTIC_MAP[gesture];
            await this.emitter.playPattern(pattern);
        }
        return event;
    }
    /**
     * Handle double-tap detection with timing tolerance
     */
    async handleTap() {
        const now = Date.now();
        const timeSinceLastTap = now - this.lastTapTime;
        this.lastTapTime = now;
        if (timeSinceLastTap <= types_1.TIMING.doubleTapInterval) {
            this.tapCount++;
            if (this.tapCount === 2) {
                this.tapCount = 0;
                return 'double_tap';
            }
        }
        else {
            this.tapCount = 1;
        }
        return 'double_tap'; // Single tap
    }
    /**
     * Handle long-press detection
     */
    async handleLongPress(durationMs) {
        if (durationMs >= types_1.TIMING.longPressThreshold) {
            return 'long_press';
        }
        return 'double_tap'; // Fallback
    }
    /**
     * Get platform-specific haptic parameters
     */
    getPlatformHapticParams(gesture) {
        const pattern = types_1.GESTURE_HAPTIC_MAP[gesture];
        switch (this.platform) {
            case 'ios':
                return this.getiOSParams(pattern);
            case 'android':
                return this.getAndroidParams(pattern);
            default:
                return pattern;
        }
    }
    getiOSParams(pattern) {
        const impactMap = {
            low: 'light',
            medium: 'medium',
            high: 'heavy',
        };
        return {
            feedbackStyle: impactMap[pattern.intensity],
            pulses: pattern.pulses.length,
        };
    }
    getAndroidParams(pattern) {
        const amplitudeMap = {
            low: 50,
            medium: 150,
            high: 255,
        };
        return {
            timings: pattern.pulses.flatMap((p, i) => [p, pattern.gaps[i] || 0]),
            amplitudes: pattern.pulses.map(() => amplitudeMap[pattern.intensity]),
        };
    }
    /**
     * Check if platform supports haptics
     */
    isSupported() {
        if (this.platform === 'web') {
            return typeof navigator !== 'undefined' && !!navigator.vibrate;
        }
        return true; // Native platforms always supported
    }
}
exports.GestureHapticBridge = GestureHapticBridge;
// ==================== Factory ====================
function createGestureHapticBridge(platform) {
    const detectedPlatform = platform || detectPlatform();
    return new GestureHapticBridge(detectedPlatform);
}
function detectPlatform() {
    if (typeof window === 'undefined')
        return 'mock';
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ios/.test(ua))
        return 'ios';
    if (/android/.test(ua))
        return 'android';
    return 'web';
}
