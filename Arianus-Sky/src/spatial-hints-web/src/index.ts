/**
 * Spatial Hints Web Renderer
 * 
 * Web-based renderer for spatial hint overlays in VR experiences.
 * Consumed by mobile XR bridge layer.
 */

export interface SpatialHint {
  id: string;
  position: { x: number; y: number; z: number };
  content: string;
  triggerDistance: number;
  fadeDistance: number;
}

export interface SpatialHintRendererConfig {
  containerId: string;
  defaultFadeDistance?: number;
}

/**
 * Initialize the spatial hints renderer
 */
export function initSpatialHints(config: SpatialHintRendererConfig): void {
  const container = document.getElementById(config.containerId);
  if (!container) {
    console.error(`[spatial-hints] Container #${config.containerId} not found`);
    return;
  }
  console.log('[spatial-hints] Initialized with config:', config);
}

/**
 * Render a spatial hint to the DOM
 */
export function renderHint(hint: SpatialHint): HTMLElement {
  const el = document.createElement('div');
  el.id = `hint-${hint.id}`;
  el.className = 'spatial-hint';
  el.textContent = hint.content;
  el.style.position = 'absolute';
  return el;
}

/**
 * Update hint position based on world coordinates
 */
export function updateHintPosition(el: HTMLElement, position: { x: number; y: number; z: number }): void {
  // Transform world coords to screen - placeholder for actual 3D projection
  el.style.transform = `translate3d(${position.x}px, ${position.y}px, ${position.z}px)`;
}

export default {
  initSpatialHints,
  renderHint,
  updateHintPosition
};
