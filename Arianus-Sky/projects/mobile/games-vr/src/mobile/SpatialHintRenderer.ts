// SpatialHint Renderer
// Handles rendering based on spatial hint: 3d_spawn, 2d_overlay, haptic_only

import {
  SpatialHint,
  SpatialHintConfig,
  SPATIAL_HINT_MAP,
} from './types';
import { GestureHapticBridge, HapticPlatform } from './GestureHapticBridge';

export type RenderCallback = (hint: SpatialHint, data?: any) => void;

export class SpatialHintRenderer {
  private currentHint: SpatialHint = 'haptic_only';
  private haptics: GestureHapticBridge | null = null;
  private renderCallback: RenderCallback | null = null;
  private platform: HapticPlatform;

  constructor(platform: HapticPlatform = 'mock') {
    this.platform = platform;
  }

  /**
   * Set the haptics bridge for haptic feedback
   */
  setHaptics(bridge: GestureHapticBridge): void {
    this.haptics = bridge;
  }

  /**
   * Set render callback for 3d_spawn and 2d_overlay
   */
  onRender(callback: RenderCallback): void {
    this.renderCallback = callback;
  }

  /**
   * Apply a spatial hint
   */
  async applyHint(hint: SpatialHint, data?: any): Promise<void> {
    const config = SPATIAL_HINT_MAP[hint];
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
  private async handleHapticOnly(): Promise<void> {
    if (this.haptics) {
      await this.haptics.processGesture('mode_toggle', 1.0);
    }
  }

  /**
   * Get current hint configuration
   */
  getConfig(): SpatialHintConfig {
    return SPATIAL_HINT_MAP[this.currentHint];
  }

  /**
   * Check if current hint requires visual rendering
   */
  shouldRenderMobile(): boolean {
    return SPATIAL_HINT_MAP[this.currentHint].renderMobile;
  }

  /**
   * Check if current hint triggers haptics
   */
  shouldTriggerHaptics(): boolean {
    return SPATIAL_HINT_MAP[this.currentHint].triggerHaptics;
  }

  /**
   * Get current hint type
   */
  getCurrentHint(): SpatialHint {
    return this.currentHint;
  }
}

// ==================== Factory ====================

export function createSpatialHintRenderer(platform?: HapticPlatform): SpatialHintRenderer {
  return new SpatialHintRenderer(platform);
}
