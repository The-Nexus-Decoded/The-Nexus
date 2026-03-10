/**
 * IntentTransformer - Bidirectional coordinate transformation
 * 
 * VR→mobile: WorldPosition (3D) → ScreenPosition (2D)
 * Mobile→VR: ScreenPosition (2D) → WorldPosition (3D)
 * 
 * @author Paithan
 * @date 2026-03-09
 */

import { WorldPosition, Vector3 } from './GestureIntent';

export interface ScreenPosition {
  x: number;        // 0-1 normalized
  y: number;       // 0-1 normalized
  scale: number;   // 0-1, based on Z distance
}

export interface ProjectionConfig {
  fov: number;           // Field of view in degrees
  aspectRatio: number;   // Screen aspect ratio
  nearPlane: number;
  farPlane: number;
}

export interface TransformResult {
  screen: ScreenPosition;
  inView: boolean;
  distance: number;
}

// Default: 60° FOV, 16:9 aspect
const DEFAULT_CONFIG: ProjectionConfig = {
  fov: 60,
  aspectRatio: 16 / 9,
  nearPlane: 0.1,
  farPlane: 100
};

export class IntentTransformer {
  private config: ProjectionConfig;
  
  // Camera state (from VR)
  private cameraPosition: WorldPosition = { x: 0, y: 0, z: 0 };
  private cameraRotation: Vector3 = { x: 0, y: 0, z: 0 };

  constructor(config: Partial<ProjectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update camera state from VR
   */
  setCamera(position: WorldPosition, rotation: Vector3): void {
    this.cameraPosition = position;
    this.cameraRotation = rotation;
  }

  /**
   * Update projection config
   */
  setConfig(config: Partial<ProjectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * VR → Mobile: WorldPosition → ScreenPosition
   * Projects 3D world coordinates onto 2D screen
   */
  worldToScreen(worldPos: WorldPosition): TransformResult {
    // Transform to camera space
    const relative = this.toCameraSpace(worldPos);
    
    // Check if in front of camera
    const inView = relative.z > this.config.nearPlane;
    
    // Calculate screen position using perspective projection
    const fovRad = (this.config.fov * Math.PI) / 180;
    const fovScale = 1 / Math.tan(fovRad / 2);
    
    // Perspective divide
    const screenX = (relative.x * fovScale) / (relative.z * this.config.aspectRatio);
    const screenY = (relative.y * fovScale) / relative.z;
    
    // Normalize to 0-1
    const normalizedX = (screenX + 1) / 2;
    const normalizedY = (1 - screenY) / 2; // Flip Y
    
    // Scale based on distance (closer = larger)
    const distance = Math.sqrt(relative.x ** 2 + relative.y ** 2 + relative.z ** 2);
    const scale = Math.max(0, Math.min(1, 5 / (distance + 1))); // Max scale at 5m
    
    return {
      screen: {
        x: normalizedX,
        y: normalizedY,
        scale
      },
      inView: inView && normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1,
      distance
    };
  }

  /**
   * Mobile → VR: ScreenPosition → WorldPosition (ray cast)
   * Unprojects 2D screen position to 3D ray
   */
  screenToWorld(screenPos: ScreenPosition, worldPlaneZ: number = 0): WorldPosition {
    // Denormalize
    const fovRad = (this.config.fov * Math.PI) / 180;
    const fovScale = Math.tan(fovRad / 2);
    
    const ndcX = (screenPos.x * 2) - 1;
    const ndcY = (screenPos.y * 2) - 1;
    
    // Ray direction in camera space
    const rayDir: Vector3 = {
      x: ndcX * this.config.aspectRatio * fovScale,
      y: ndcY * fovScale,
      z: -1
    };
    
    // Transform to world space (simplified - assumes no camera rotation for now)
    const worldPos: WorldPosition = {
      x: this.cameraPosition.x + rayDir.x * Math.abs(worldPlaneZ - this.cameraPosition.z),
      y: this.cameraPosition.y + rayDir.y * Math.abs(worldPlaneZ - this.cameraPosition.z),
      z: worldPlaneZ
    };
    
    return worldPos;
  }

  /**
   * Transform world position to camera-relative coordinates
   */
  private toCameraSpace(worldPos: WorldPosition): WorldPosition {
    const dx = worldPos.x - this.cameraPosition.x;
    const dy = worldPos.y - this.cameraPosition.y;
    const dz = worldPos.z - this.cameraPosition.z;
    
    // Apply camera rotation (simplified pitch/yaw)
    const pitch = this.cameraRotation.x;
    const yaw = this.cameraRotation.y;
    
    // Rotate around Y axis (yaw)
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const x1 = dx * cosYaw - dz * sinYaw;
    const z1 = dx * sinYaw + dz * cosYaw;
    
    // Rotate around X axis (pitch)
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const y2 = dy * cosPitch - z1 * sinPitch;
    const z2 = dy * sinPitch + z1 * cosPitch;
    
    return { x: x1, y: y2, z: z2 };
  }

  /**
   * Check if world position is visible on screen
   */
  isVisible(worldPos: WorldPosition): boolean {
    const result = this.worldToScreen(worldPos);
    return result.inView;
  }

  /**
   * Get screen bounds for a world object with radius
   */
  getScreenBounds(worldPos: WorldPosition, worldRadius: number): {
    left: number;
    right: number;
    top: number;
    bottom: number;
  } | null {
    const result = this.worldToScreen(worldPos);
    if (!result.inView) return null;
    
    const scaledRadius = worldRadius * result.screen.scale;
    
    return {
      left: Math.max(0, result.screen.x - scaledRadius),
      right: Math.min(1, result.screen.x + scaledRadius),
      top: Math.max(0, result.screen.y - scaledRadius),
      bottom: Math.min(1, result.screen.y + scaledRadius)
    };
  }

  /**
   * Convert screen percentage to pixels
   */
  screenToPixels(screenPos: ScreenPosition, viewportWidth: number, viewportHeight: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    return {
      x: screenPos.x * viewportWidth,
      y: screenPos.y * viewportHeight,
      width: screenPos.scale * Math.min(viewportWidth, viewportHeight),
      height: screenPos.scale * Math.min(viewportWidth, viewportHeight)
    };
  }

  /**
   * Get camera position
   */
  getCameraPosition(): WorldPosition {
    return { ...this.cameraPosition };
  }

  /**
   * Get config
   */
  getConfig(): ProjectionConfig {
    return { ...this.config };
  }
}

// Singleton
export const intentTransformer = new IntentTransformer();

// === AmbientSkin Integration ===

import { SpatialHint } from './ambient-skin/types';

/**
 * Transform VR event to mobile presentation
 * Uses SpatialHint to determine rendering approach
 */
export function transformVRToMobile(
  worldPos: WorldPosition,
  spatialHint: SpatialHint,
  viewportWidth: number,
  viewportHeight: number
): {
  presentation: '3d_spawn' | '2d_overlay' | 'haptic_only';
  screenPosition?: { x: number; y: number; width: number; height: number };
  hapticOnly: boolean;
} {
  switch (spatialHint) {
    case 'haptic_only': {
      return { presentation: 'haptic_only', hapticOnly: true };
    }
    
    case '2d_overlay': {
      const result = intentTransformer.worldToScreen(worldPos);
      const pixels = intentTransformer.screenToPixels(
        result.screen,
        viewportWidth,
        viewportHeight
      );
      return {
        presentation: '2d_overlay',
        screenPosition: pixels,
        hapticOnly: false
      };
    }
    
    case '3d_spawn': {
      const result = intentTransformer.worldToScreen(worldPos);
      const pixels = intentTransformer.screenToPixels(
        result.screen,
        viewportWidth,
        viewportHeight
      );
      return {
        presentation: '3d_spawn',
        screenPosition: pixels,
        hapticOnly: false
      };
    }
  }
}
