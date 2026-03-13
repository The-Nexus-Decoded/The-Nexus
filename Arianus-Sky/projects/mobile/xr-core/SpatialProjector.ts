/**
 * SpatialProjector
 * Transforms normalized device coordinates (0-1) to VR world space (meters)
 * Used by mobile gesture capture to emit world-positioned intents for XR
 */

export interface SpatialBounds {
  worldWidth: number;   // meters
  worldHeight: number;  // meters
  origin: 'center' | 'bottom-left';
}

export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

export interface NormalizedPosition {
  x: number;  // 0-1
  y: number;  // 0-1
}

/** Default bounds: 2m x 2m play space, centered origin */
export const DEFAULT_BOUNDS: SpatialBounds = {
  worldWidth: 2.0,
  worldHeight: 2.0,
  origin: 'center'
};

/**
 * Project normalized (0-1) coordinates to world space (meters)
 * @param nx - Normalized X (0 = left, 1 = right)
 * @param ny - Normalized Y (0 = bottom, 1 = top)
 * @param bounds - Play space dimensions
 * @returns World position in meters
 */
export function toWorldSpace(
  nx: number,
  ny: number,
  bounds: SpatialBounds = DEFAULT_BOUNDS
): WorldPosition {
  // Clamp to valid range
  const cx = Math.max(0, Math.min(1, nx));
  const cy = Math.max(0, Math.min(1, ny));

  let wx: number;
  let wy: number;

  if (bounds.origin === 'center') {
    // Origin at center: 0.5, 0.5 → 0, 0
    wx = (cx - 0.5) * bounds.worldWidth;
    wy = (cy - 0.5) * bounds.worldHeight;
  } else {
    // Origin at bottom-left: 0, 0 → -width/2, -height/2 (to match center alignment)
    wx = cx * bounds.worldWidth - bounds.worldWidth / 2;
    wy = cy * bounds.worldHeight - bounds.worldHeight / 2;
  }

  return { x: wx, y: wy, z: 0 };
}

/**
 * Inverse: World space (meters) to normalized (0-1)
 * @param wx - World X in meters
 * @param wy - World Y in meters
 * @param bounds - Play space dimensions
 * @returns Normalized position
 */
export function toNormalizedSpace(
  wx: number,
  wy: number,
  bounds: SpatialBounds = DEFAULT_BOUNDS
): NormalizedPosition {
  let nx: number;
  let ny: number;

  if (bounds.origin === 'center') {
    nx = (wx / bounds.worldWidth) + 0.5;
    ny = (wy / bounds.worldHeight) + 0.5;
  } else {
    nx = (wx + bounds.worldWidth / 2) / bounds.worldWidth;
    ny = (wy + bounds.worldHeight / 2) / bounds.worldHeight;
  }

  return { x: nx, y: ny };
}

/**
 * Create a bounds config from physical play space measurement
 * @param widthMeters - Width of VR play area in meters
 * @param heightMeters - Height of VR play area in meters
 * @param origin - Origin mode
 */
export function createBounds(
  widthMeters: number,
  heightMeters: number,
  origin: SpatialBounds['origin'] = 'center'
): SpatialBounds {
  return {
    worldWidth: widthMeters,
    worldHeight: heightMeters,
    origin
  };
}

/**
 * Clamp a world position to stay within bounds
 */
export function clampToBounds(
  pos: WorldPosition,
  bounds: SpatialBounds = DEFAULT_BOUNDS
): WorldPosition {
  const halfW = bounds.worldWidth / 2;
  const halfH = bounds.worldHeight / 2;

  return {
    x: Math.max(-halfW, Math.min(halfW, pos.x)),
    y: Math.max(-halfH, Math.min(halfH, pos.y)),
    z: pos.z
  };
}

// === Examples ===
// toWorldSpace(0.5, 0.5) → { x: 0, y: 0, z: 0 }       // center
// toWorldSpace(0, 0)     → { x: -1, y: -1, z: 0 }      // bottom-left (2m bounds)
// toWorldSpace(1, 1)     → { x: 1, y: 1, z: 0 }       // top-right
