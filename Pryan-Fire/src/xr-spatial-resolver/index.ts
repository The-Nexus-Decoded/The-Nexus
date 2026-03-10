/**
 * XR Spatial Resolver V1
 * 
 * Core spatial mathematics for XR experiences:
 * - hitTest: Find entities at screen/world positions
 * - raycast: Spatial ray queries
 * - getEntityState: Query entity transform/state
 * 
 * Version: 1.0.0
 * Contract: XR-Gesture-Resolver-Contract.md
 */

import * as THREE from 'three';

/**
 * Coordinate space definitions
 */
export enum CoordinateSpace {
  SCREEN = 'screen',
  WORLD = 'world',
  LOCAL = 'local',
  ENTITY = 'entity'
}

/**
 * Entity state snapshot
 */
export interface EntityState {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
  worldMatrix: THREE.Matrix4;
  boundingBox?: THREE.Box3;
  boundingSphere?: THREE.Sphere;
}

/**
 * Hit test result
 */
export interface HitResult {
  entity: EntityState;
  distance: number;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  uv?: THREE.Vector2;
}

/**
 * Raycast options
 */
export interface RaycastOptions {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  maxDistance?: number;
  layers?: number[];
  exclude?: Set<string>;
}

/**
 * Anchor/Resolve result
 */
export interface AnchorResult {
  entityId: string;
  anchorPosition: THREE.Vector3;
  resolvedPosition: THREE.Vector3;
  coordinateSpace: CoordinateSpace;
}

/**
 * XR Spatial Resolver V1
 * 
 * Core contract:
 * - anchor/resolve: Map between coordinate spaces
 * - coordinate spaces: screen ↔ world ↔ local ↔ entity
 * - raycast: Find intersections with entities
 * - getEntityState: Query current entity transform
 */
export class XRSpatialResolver {
  private entities: Map<string, EntityState> = new Map();
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  
  // Reference distance for gesture scaling (V1 default: 1.0m)
  private referenceDistance: number = 1.0;

  constructor() {}

  /**
   * Initialize resolver with Three.js scene and camera
   */
  initialize(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    this.scene = scene;
    this.camera = camera;
  }

  /**
   * Register an entity with the resolver
   */
  registerEntity(id: string, object: THREE.Object3D): void {
    const state = this.getEntityStateFromObject(id, object);
    this.entities.set(id, state);
  }

  /**
   * Unregister an entity
   */
  unregisterEntity(id: string): void {
    this.entities.delete(id);
  }

  /**
   * Update entity state (call each frame)
   */
  updateEntity(id: string, object: THREE.Object3D): void {
    const state = this.getEntityStateFromObject(id, object);
    this.entities.set(id, state);
  }

  /**
   * Get current entity state
   */
  getEntityState(entityId: string): EntityState | null {
    return this.entities.get(entityId) || null;
  }

  /**
   * Convert screen coordinates to world ray
   */
  screenToRay(screenX: number, screenY: number): THREE.Raycaster {
    if (!this.camera) {
      throw new Error('Camera not initialized');
    }

    const normalizedX = (screenX / window.innerWidth) * 2 - 1;
    const normalizedY = -(screenY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), this.camera);
    
    return raycaster;
  }

  /**
   * Perform hit test at screen position
   */
  hitTest(screenX: number, screenY: number, layers?: number[]): HitResult[] {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }

    const raycaster = this.screenToRay(screenX, screenY);
    const intersects = raycaster.intersectObjects(
      this.getSceneObjects(), 
      true
    );

    return intersects.map(intersection => ({
      entity: this.getEntityStateFromObject(
        intersection.object.uuid, 
        intersection.object
      ),
      distance: intersection.distance,
      point: intersection.point.clone(),
      normal: intersection.face?.normal.clone() || new THREE.Vector3(),
      uv: intersection.uv?.clone()
    })).filter(hit => hit.entity !== null) as HitResult[];
  }

  /**
   * Perform raycast from world space
   */
  raycast(options: RaycastOptions): HitResult[] {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }

    const raycaster = new THREE.Raycaster(options.origin, options.direction);
    
    if (options.maxDistance) {
      raycaster.far = options.maxDistance;
    }

    const objects = this.getSceneObjects().filter(obj => {
      if (options.layers && options.layers.length > 0) {
        return options.layers.includes(obj.layers);
      }
      if (options.exclude) {
        return !options.exclude.has(obj.uuid);
      }
      return true;
    });

    const intersects = raycaster.intersectObjects(objects, true);

    return intersects.map(intersection => ({
      entity: this.getEntityStateFromObject(
        intersection.object.uuid, 
        intersection.object
      ),
      distance: intersection.distance,
      point: intersection.point.clone(),
      normal: intersection.face?.normal.clone() || new THREE.Vector3()
    })) as HitResult[];
  }

  /**
   * Resolve position between coordinate spaces
   */
  resolve(
    position: THREE.Vector3,
    fromSpace: CoordinateSpace,
    toSpace: CoordinateSpace,
    entityId?: string
  ): THREE.Vector3 {
    const result = position.clone();

    // Handle coordinate space conversions
    if (fromSpace === CoordinateSpace.SCREEN && toSpace === CoordinateSpace.WORLD) {
      return this.screenToWorld(position);
    }
    
    if (fromSpace === CoordinateSpace.WORLD && toSpace === CoordinateSpace.SCREEN) {
      return this.worldToScreen(position);
    }

    if (fromSpace === CoordinateSpace.WORLD && toSpace === CoordinateSpace.LOCAL && entityId) {
      return this.worldToLocal(position, entityId);
    }

    if (fromSpace === CoordinateSpace.LOCAL && toSpace === CoordinateSpace.WORLD && entityId) {
      return this.localToWorld(position, entityId);
    }

    return result;
  }

  /**
   * Convert screen position to world position at given depth
   */
  screenToWorld(screenPos: THREE.Vector3, depth: number = 1.0): THREE.Vector3 {
    if (!this.camera) {
      throw new Error('Camera not initialized');
    }

    const vector = new THREE.Vector3(
      screenPos.x,
      screenPos.y,
      0.5
    );
    
    vector.unproject(this.camera);
    vector.sub(this.camera.position).normalize();
    
    const distance = depth;
    const worldPos = new THREE.Vector3()
      .copy(this.camera.position)
      .add(vector.multiplyScalar(distance));
    
    return worldPos;
  }

  /**
   * Convert world position to screen coordinates
   */
  worldToScreen(worldPos: THREE.Vector3): THREE.Vector3 {
    if (!this.camera) {
      throw new Error('Camera not initialized');
    }

    const vector = worldPos.clone();
    vector.project(this.camera);

    return new THREE.Vector3(
      (vector.x * 0.5 + 0.5) * window.innerWidth,
      -(vector.y * 0.5 - 0.5) * window.innerHeight,
      vector.z
    );
  }

  /**
   * Convert world position to local entity space
   */
  worldToLocal(worldPos: THREE.Vector3, entityId: string): THREE.Vector3 {
    const entity = this.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const localPos = worldPos.clone();
    localPos.applyQuaternion(entity.rotation.clone().invert());
    localPos.sub(entity.position);

    return localPos;
  }

  /**
   * Convert local entity position to world space
   */
  localToWorld(localPos: THREE.Vector3, entityId: string): THREE.Vector3 {
    const entity = this.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const worldPos = localPos.clone();
    worldPos.applyQuaternion(entity.rotation);
    worldPos.add(entity.position);

    return worldPos;
  }

  /**
   * Set reference distance for gesture scaling
   */
  setReferenceDistance(distance: number): void {
    this.referenceDistance = Math.max(0.5, Math.min(2.0, distance));
  }

  /**
   * Get reference distance
   */
  getReferenceDistance(): number {
    return this.referenceDistance;
  }

  /**
   * Calculate gesture magnitude with depth scaling (V2)
   */
  calculateScaledMagnitude(
    gestureMagnitude: number, 
    actualDistance: number
  ): number {
    return gestureMagnitude * (actualDistance / this.referenceDistance);
  }

  /**
   * Get all registered scene objects
   */
  private getSceneObjects(): THREE.Object3D[] {
    if (!this.scene) return [];
    return this.scene.children.flatMap(this.flattenObject);
  }

  /**
   * Flatten object3D hierarchy
   */
  private flattenObject(obj: THREE.Object3D): THREE.Object3D[] {
    const result: THREE.Object3D[] = [obj];
    obj.children.forEach(child => {
      result.push(...this.flattenObject(child));
    });
    return result;
  }

  /**
   * Extract entity state from Three.js object
   */
  private getEntityStateFromObject(id: string, object: THREE.Object3D): EntityState {
    const worldMatrix = new THREE.Matrix4();
    object.updateWorldMatrix(true, false);
    worldMatrix.copy(object.matrixWorld);

    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    
    worldMatrix.decompose(position, rotation, scale);

    const state: EntityState = {
      id,
      position,
      rotation,
      scale,
      worldMatrix
    };

    // Add bounding info if available
    if (object instanceof THREE.Mesh) {
      const geometry = object.geometry;
      if (geometry.boundingBox === null) {
        geometry.computeBoundingBox();
      }
      if (geometry.boundingBox) {
        state.boundingBox = geometry.boundingBox.clone().applyMatrix4(worldMatrix);
      }
      if (geometry.boundingSphere === null) {
        geometry.computeBoundingSphere();
      }
      if (geometry.boundingSphere) {
        const sphere = geometry.boundingSphere.clone();
        sphere.applyMatrix4(worldMatrix);
        state.boundingSphere = sphere;
      }
    }

    return state;
  }
}

export default XRSpatialResolver;
