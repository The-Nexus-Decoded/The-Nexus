import { GestureType, GestureEvent, HapticPattern } from './types';
export type HapticPlatform = 'ios' | 'android' | 'web' | 'mock';
export interface HapticEmitter {
    playPattern(pattern: HapticPattern): Promise<void>;
}
export declare class iOSHapticEmitter implements HapticEmitter {
    private impactLight;
    private impactMedium;
    private impactHeavy;
    private notification;
    constructor();
    playPattern(pattern: HapticPattern): Promise<void>;
}
export declare class AndroidHapticEmitter implements HapticEmitter {
    private vibrator;
    constructor();
    playPattern(pattern: HapticPattern): Promise<void>;
}
export declare class WebHapticEmitter implements HapticEmitter {
    playPattern(pattern: HapticPattern): Promise<void>;
}
export declare class MockHapticEmitter implements HapticEmitter {
    private logs;
    playPattern(pattern: HapticPattern): Promise<void>;
    getLogs(): HapticPattern[];
    clear(): void;
}
export declare class GestureHapticBridge {
    private emitter;
    private platform;
    private lastTapTime;
    private tapCount;
    constructor(platform: HapticPlatform);
    private createEmitter;
    /**
     * Process a gesture event and trigger appropriate haptics
     */
    processGesture(gesture: GestureType, confidence: number): Promise<GestureEvent>;
    /**
     * Handle double-tap detection with timing tolerance
     */
    handleTap(): Promise<GestureType>;
    /**
     * Handle long-press detection
     */
    handleLongPress(durationMs: number): Promise<GestureType>;
    /**
     * Get platform-specific haptic parameters
     */
    getPlatformHapticParams(gesture: GestureType): object;
    private getiOSParams;
    private getAndroidParams;
    /**
     * Check if platform supports haptics
     */
    isSupported(): boolean;
}
export declare function createGestureHapticBridge(platform?: HapticPlatform): GestureHapticBridge;
