import { SpatialHint, SpatialHintConfig } from './types';
import { GestureHapticBridge, HapticPlatform } from './GestureHapticBridge';
export type RenderCallback = (hint: SpatialHint, data?: any) => void;
export declare class SpatialHintRenderer {
    private currentHint;
    private haptics;
    private renderCallback;
    private platform;
    constructor(platform?: HapticPlatform);
    /**
     * Set the haptics bridge for haptic feedback
     */
    setHaptics(bridge: GestureHapticBridge): void;
    /**
     * Set render callback for 3d_spawn and 2d_overlay
     */
    onRender(callback: RenderCallback): void;
    /**
     * Apply a spatial hint
     */
    applyHint(hint: SpatialHint, data?: any): Promise<void>;
    /**
     * Handle haptic_only mode - no visual rendering
     */
    private handleHapticOnly;
    /**
     * Get current hint configuration
     */
    getConfig(): SpatialHintConfig;
    /**
     * Check if current hint requires visual rendering
     */
    shouldRenderMobile(): boolean;
    /**
     * Check if current hint triggers haptics
     */
    shouldTriggerHaptics(): boolean;
    /**
     * Get current hint type
     */
    getCurrentHint(): SpatialHint;
}
export declare function createSpatialHintRenderer(platform?: HapticPlatform): SpatialHintRenderer;
