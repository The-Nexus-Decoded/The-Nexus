"use strict";
// SpatialHint Renderer
// Handles rendering based on spatial hint: 3d_spawn, 2d_overlay, haptic_only
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpatialHintRenderer = void 0;
exports.createSpatialHintRenderer = createSpatialHintRenderer;
const types_1 = require("./types");
class SpatialHintRenderer {
    constructor(platform = 'mock') {
        this.currentHint = 'haptic_only';
        this.haptics = null;
        this.renderCallback = null;
        this.platform = platform;
    }
    /**
     * Set the haptics bridge for haptic feedback
     */
    setHaptics(bridge) {
        this.haptics = bridge;
    }
    /**
     * Set render callback for 3d_spawn and 2d_overlay
     */
    onRender(callback) {
        this.renderCallback = callback;
    }
    /**
     * Apply a spatial hint
     */
    async applyHint(hint, data) {
        const config = types_1.SPATIAL_HINT_MAP[hint];
        this.currentHint = hint;
        // Handle haptic-only case
        if (hint === 'haptic_only') {
            await this.handleHapticOnly();
            return;
        }
        // Handle visual rendering (3d_spawn or 2d_overlay)
        if (this.renderCallback && config.renderMobile) {
            this.renderCallback(hint, data);
        }
        // Trigger haptics if configured
        if (config.triggerHaptics && this.haptics) {
            await this.haptics.processGesture('double_tap', 1.0);
        }
    }
    /**
     * Handle haptic_only mode - no visual rendering
     */
    async handleHapticOnly() {
        if (this.haptics) {
            await this.haptics.processGesture('mode_toggle', 1.0);
        }
    }
    /**
     * Get current hint configuration
     */
    getConfig() {
        return types_1.SPATIAL_HINT_MAP[this.currentHint];
    }
    /**
     * Check if current hint requires visual rendering
     */
    shouldRenderMobile() {
        return types_1.SPATIAL_HINT_MAP[this.currentHint].renderMobile;
    }
    /**
     * Check if current hint triggers haptics
     */
    shouldTriggerHaptics() {
        return types_1.SPATIAL_HINT_MAP[this.currentHint].triggerHaptics;
    }
    /**
     * Get current hint type
     */
    getCurrentHint() {
        return this.currentHint;
    }
}
exports.SpatialHintRenderer = SpatialHintRenderer;
// ==================== Factory ====================
function createSpatialHintRenderer(platform) {
    return new SpatialHintRenderer(platform);
}
